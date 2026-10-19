# Adresses de livraison Google Places

Date : 2026-10-19

Statut : choix fonctionnels et adaptation de conservation valides en conversation ; specification ecrite a relire avant le plan d'implementation. Ce document ne signifie pas que l'integration est deja implementee ou deployee.

Cette evolution complete la V1 de livraison existante dans `pos-app` et `express-pos`. Elle remplace la saisie postale et la recherche IGN des nouvelles adresses par Google Places, sans changer le moteur de commande.

## Objectif et decisions

- Un seul champ Adresse propose des adresses pendant la frappe. La selection remplit les informations postales et recupere les GPS sans saisie manuelle des coordonnees.
- Le composant partage couvre l'origine du restaurant, le checkout caisse/site et le carnet client. Les complements et consignes restent facultatifs, dans une section repliee par defaut.
- Google est appele uniquement par le backend. La cle `GOOGLE_PLACES_API_KEY` ne doit apparaitre ni dans Nuxt, ni dans le navigateur, ni dans les logs ou messages d'erreur.
- Les references Google sont durables ; les GPS Google ne sont pas enregistres en base. Un cache memoire de 15 minutes maximum suffit a reutiliser les coordonnees pendant une operation.
- Les distances restent calculees a vol d'oiseau et les tarifs restent ceux des paliers existants. Pas de Routes API, de carte integree, de suivi GPS du livreur ou de nouvel operateur SMS.
- Les anciens dossiers et origines IGN restent utilisables sans conversion automatique ni recherche Google en masse.

## Pourquoi separer reference et GPS

La documentation autorise la conservation du `place_id`. Les conditions Places limitent le cache GPS a 30 jours. Google distingue aussi l'adresse postale selectionnee par un utilisateur pour sa transaction des suggestions et des autres donnees Places. Cette exception ne doit pas etre generalisee au carnet d'adresses reutilise entre transactions.

Sources officielles consultees le 2026-10-19 : [politiques Places](https://developers.google.com/maps/documentation/places/web-service/policies), [conditions EEE, section 15](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms), [usages Places autorises en EEE](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses).

L'architecture ne repose donc pas sur un effacement tardif des GPS dans les journaux financiers. Elle empeche leur persistence pour les nouvelles adresses Google. L'expiration du cache est une vraie suppression en memoire, pas seulement une date ajoutee a une copie durable.

## Parcours et interface

1. A partir de 3 caracteres utiles, une pause de 300 ms declenche une recherche cote serveur, limitee a la France et aux adresses postales. Une frappe continue ne doit pas lancer une requete par touche.
2. Au maximum 5 suggestions sont affichees avec attribution Google Maps. Les listes vides, le chargement, l'indisponibilite du fournisseur et la selection invalide ont des etats distincts en francais.
3. La selection explicite demande les details au serveur. Une ville, un code postal ou un etablissement sans adresse de livraison precise ne suffit pas. Le serveur exige numero, voie, code postal francais, commune et coordonnees valides ; pas de remplacement silencieux par un centre de rue.
4. La validation emet le meme resultat metier qu'aujourd'hui : adresse structuree, preuve signee et expiration. Le navigateur ne peut pas fournir lui-meme les GPS faisant foi.
5. Modifier le texte invalide immediatement la selection, sa preuve et le devis. Changer de restaurant, de session ou d'adresse ignore les anciennes reponses reseau. Une modification du seul complement ne relance pas Google.
6. La liste est utilisable au clavier et au tactile, sans debordement mobile. Le composant conserve le contrat `resolved` et la methode `resolve()` utilises par les parents.

L'adresse francaise `60 rue Francois 1er` est un cas de recette : l'utilisateur choisit la suggestion canonique Google, sans egalite textuelle imposee entre `1er` et `Ier`.

## Frontiere serveur

- Utiliser Autocomplete (New), puis Place Details (New). Le masque des details est limite aux champs necessaires : identifiant, composants d'adresse, adresse formatee et position ; ni avis, ni photos, ni donnees Pro inutiles.
- Une session d'autocompletion possede un jeton aleatoire distinct. Il accompagne la recherche puis les details de la selection, et est abandonne apres selection ou changement de contexte. Une relecture d'un lieu deja enregistre ne recycle pas une session terminee.
- Ajouter les recherches sous `/delivery/address-suggestions` pour les acteurs autorises au checkout et `/customer/address-suggestions` pour les clients verifies. Reutiliser les protections des resolutions correspondantes, dont CSRF et CORS pour le compte client.
- Le restaurant et le client proviennent toujours de la session verifiee. Un compte livreur ne recoit pas de droit de recherche general ou d'acces au carnet client.
- Etendre les resolutions existantes avec une selection Google identifiee. Conserver les chemins de resolution d'une adresse deja enregistree, les preuves signees de 15 minutes et les devis de 5 minutes lies au restaurant.
- Authentification, validation de l'entree et disponibilite de la signature sont verifiees avant consommation du quota fournisseur. Les nouveaux appels partagent un quota SQL global, toutes instances et tous restaurants confondus, borne a 40 appels dans toute seconde glissante conservative.
- Les appels ont un delai maximal de 5 secondes, une taille de reponse bornee et aucune relance automatique. Une erreur Google ne revele ni cle ni reponse brute et ne bascule pas silencieusement vers IGN.
- Le transport HTTP utilise une unique option objet, compatible avec le patch HTTP apporte par la dependance Mailjet deja installee.
- Les reponses postales portent `Cache-Control: no-store`. Les requetes contiennent uniquement le texte postal utile, jamais nom, telephone, interphone ou consignes privees.

## Stockage et compatibilite

### Nouvelle reference Google

La representation durable contient `provider: google_places`, `placeId` et uniquement les donnees metier propres au dossier : identifiant du carnet, libelle Adresse 1/Adresse 2, complement et consignes. Aucun objet fournisseur brut ni jeton de session d'autocompletion n'est conserve.

Le cache GPS est indexe par restaurant et lieu, borne a 1000 entrees avec eviction et deduplication des appels simultanes. Il expire au plus tard 15 minutes apres reception, sans prolongation a la lecture. Une purge periodique supprime les entrees expirees ; un redemarrage vide le cache. Pas de cache disque, de persistance Redis, de logs de corps reseau ou de sauvegarde de ce cache.

Les libelles et composants Google necessaires a l'affichage du carnet sont obtenus a la demande, sans copie durable des resultats Places. Une liste du carnet reste disponible par ses libelles et actions si Google est indisponible ; chaque adresse non resolue expose son propre etat, sans faire echouer tout le carnet. La suppression et le choix d'une adresse par defaut restent possibles sans appel Google. Une adresse Google doit etre resolue pour etre utilisee dans un nouveau devis.

### Origine du restaurant

Ajouter une reference Google a l'origine. La position est chargee en memoire pour le calcul du devis, pas recopiee dans `origin_latitude` / `origin_longitude`. L'expiration du cache ne desactive pas le parametre Livraison et ne modifie ni revision, ni paliers, ni rayon.

En cas d'echec Google sans position fraiche, refuser le nouveau devis avec une erreur fournisseur explicite. Ne pas substituer la position d'un autre lieu ou utiliser une position expiree. Les anciennes origines IGN continuent a utiliser leurs colonnes actuelles.

### Commandes, historique et idempotence

Les nouvelles commandes Google conservent la reference du lieu et l'adresse postale effectivement selectionnee pour cette transaction, distincte de la reponse brute Place Details. Cette trace ne sert pas de cache Places pour des commandes futures. Les adresses selectionnees reutilisables du carnet restent des references hydratees a la demande.

Ne jamais ecrire de GPS Google dans `deliveries.latitude`, `deliveries.longitude`, les JSON `address_snapshot`, les resultats d'idempotence ou les journaux immuables, y compris leurs objets imbriques. Une serialisation explicite separe la preuve de calcul temporaire des donnees persistables avant chaque ecriture. Les preuves et devis temporaires contenant des GPS ne vont ni dans le stockage persistant du navigateur, ni dans les journaux serveur.

Une migration additive autorise la paire de coordonnees nulle uniquement pour un dossier portant une reference Google valide. Le controle des anciennes paires de coordonnees et des contraintes d'activation du restaurant reste effectif. Les validations metier exigent toujours une position fraiche avant calcul d'un nouveau devis.

Les journaux de paiement, de frais et d'evenements existants ne sont ni modifies ni purges. Une hydratation ou expiration de position ne recalcule jamais les frais acceptes, les montants, la TVA, les paiements, les versions ou les statuts. Le rejeu d'une operation conserve son resultat metier meme si Google est indisponible ; l'enrichissement postal courant reste separe du resultat persiste.

Les ecrans de livraison et les raccourcis de navigation utilisent la reference Google ou l'adresse de transaction, pas des GPS conserves dans un journal. Le suivi public et les dossiers fermes conservent leurs regles actuelles d'autorisation et de masquage des donnees privees. Ne pas lancer un appel fournisseur pour un contenu que l'acteur n'a pas le droit de consulter.

### Migration et retour arriere

Ne pas modifier les migrations deja appliquees. Ne convertir aucune adresse existante et ne changer aucune configuration de restaurant au deploiement. Les modifications de schema ne doivent pas supprimer les protections des journaux immuables.

Une fois des references Google ecrites, un ancien backend exigeant des GPS non nuls n'est plus une cible de retour arriere acceptable. Le deploiement doit conserver une version compatible avec les deux representations ; ne pas supprimer des commandes pour revenir en arriere.

## Repartition des responsabilites

- Backend : service Google dedie, codec de reference et serialisation persistable, adaptation des resolutions/devis et du stockage des origines/carnets/dossiers, enrichissement des vues autorisees.
- Frontend : `DeliveryAddressInput.vue`, ses trois parents de parcours et les stores `delivery` / `customer`. Reutiliser Nuxt 2, Vue 2, Vuetify, Axios et les icones MDI ; aucune nouvelle dependance necessaire.
- Base : nouvelle migration ciblee pour les references Google et les contraintes de position. Aucun changement aux tarifs, aux paiements, aux stocks ou aux permissions generales.
- Exploitation : conserver les cles chiffrees deja ajoutees aux environnements backend. Pas de cle Google frontend, pas de changement production automatique.

## Criteres de verification

- Tests fournisseur sans appel Google reel : requetes et masques exacts, session, France, selection numerotee, reponse malformee, timeout, refus fournisseur, erreurs expurgees et quota partage.
- Tests d'autorisation staff/client/livreur, isolation entre restaurants, CSRF et preflight CORS ; aucune consommation du quota avant controle de l'acteur.
- Tests composant : champ unique, debounce, clavier, selection, complement, frappe apres selection, erreur et reponse tardive apres changement de contexte ou destruction.
- Tests de conservation avec horloge controlee : entree expiree supprimee, absence de cache disque et de GPS dans toutes les ecritures d'une commande Google, y compris les resultats de rejeu et les journaux imbriques.
- Tests SQL sur base dediee : ancienne representation intacte, references Google sans GPS admises, paires incoherentes refusees, origine Google active valide et journaux financiers toujours immuables.
- Parcours de regression : creation puis archivage, attribution et consultation livreur, rejeu idempotent, suivi public, panne Google apres acceptation ; montants et droits inchanges.
- Verification finale : suites frontend/backend, lint des fichiers touches, build Nuxt et recette desktop/mobile sur serveur local. Une recette avec la vraie cle est bornee a une adresse publique et annoncee comme appel fournisseur reel, jamais comme test unitaire.

## Conditions avant activation

Activer Places API (New) et la facturation sur le projet Google de la cle, limiter cette cle a l'API et aux IP publiques de sortie du backend, et definir les quotas Google Cloud. La presence de la cle dans un fichier ne prouve pas que ces conditions sont remplies.

Afficher l'attribution officielle Google Maps et rendre accessibles les conditions d'utilisation et la politique de confidentialite requises. La validation technique du stockage n'est pas une certification juridique de l'ensemble du produit.

Le commit/push et le deploiement Docker feront l'objet d'une demande distincte apres verification. Aucune modification production n'est incluse dans ce cadrage.
