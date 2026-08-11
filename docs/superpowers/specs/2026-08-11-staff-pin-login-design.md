# Connexion caisse par ID equipe et PIN

## Objectif

Permettre au personnel d'un shop de se connecter rapidement a la caisse sans
utiliser d'e-mail. Chaque vrai utilisateur de l'application dispose d'un ID
equipe court et unique globalement, ainsi que d'un PIN a quatre chiffres.

L'administrateur conserve aussi la connexion existante par e-mail et mot de
passe, en plus de la connexion par ID equipe et PIN.

## Identifiants

- `staff_login_id`: code de six caracteres majuscules et chiffres, genere par
  l'application avec un alphabet qui evite les caracteres ambigus.
- L'ID est unique sur toute l'application, sans dependance au shop.
- `staff_pin_hash`: hash du PIN a quatre chiffres. Le PIN n'est jamais
  conserve ni renvoye apres sa creation ou sa reinitialisation.
- Les roles Admin, Caissier, Serveur et Cuisine utilisent ces identifiants.
- Les comptes Table QR et Click & Collect ne recoivent pas ces identifiants.

## Gestion de l'equipe

La page Staff / Equipe evolue ainsi:

- A la creation, l'ID caisse est genere automatiquement et affiche a
  l'administrateur. Il renseigne le PIN a quatre chiffres a transmettre a
  l'employe.
- La liste affiche une colonne `ID caisse`, mais jamais le PIN.
- Les actions d'un membre permettent de regenerer l'ID caisse et de definir
  un nouveau PIN.
- Les membres existants, sans ID ou PIN, affichent une action pour creer leurs
  identifiants caisse.
- L'e-mail devient une information de contact facultative pour les comptes
  staff; plusieurs membres peuvent partager la meme adresse e-mail.

## Connexion

L'ecran de connexion propose deux modes:

1. E-mail et mot de passe: conserve pour les administrateurs existants.
2. ID equipe et PIN: disponible pour les administrateurs, caissiers, serveurs
   et personnel de cuisine.

Le backend cherche l'utilisateur par `staff_login_id`, verifie le hash du PIN,
controle que le compte est actif et renvoie la session existante. Le shop est
deduit du compte trouve; il ne fait pas partie de l'identifiant de connexion.

## Migration et compatibilite

Une migration ajoute les deux colonnes et un index unique sur
`staff_login_id`. Elles restent nulles pour les comptes qui ne peuvent pas
utiliser le mode caisse. Les comptes staff existants restent utilisables avec
leur ancienne connexion jusqu'a ce qu'un administrateur cree leurs
identifiants caisse.

## Tests

- Generation d'ID sans collision et contrainte d'unicite.
- Connexion par ID et PIN valide, PIN incorrect et compte desactive.
- Connexion e-mail et mot de passe de l'administrateur conservee.
- Creation, reinitialisation du PIN et generation d'identifiants pour un
  membre existant.
