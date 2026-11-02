# Icône des notifications Apple Wallet

Le client confirme que le logo SmartEat indésirable apparaît dans les notifications Apple Wallet. Le diagnostic staging montre une icône globale et aucun fichier `icon` dans les visuels publiés par restaurant. Le champ URL Google Wallet n'intervient pas dans la signature Apple.

Ajouter une importation carrée « Icône des notifications Apple Wallet » à l'éditeur existant. Produire `icon.png`, `icon@2x.png`, `icon@3x.png` en 38, 76 et 114 pixels, selon les recommandations Apple actuelles : https://developer.apple.com/design/human-interface-guidelines/wallet. Le restaurant choisit son image ; aucune image de test ni notification ne doit être publiée automatiquement.

Réutiliser le stockage versionné, l'autorisation administrateur et la publication atomique existants. Conserver les logos/bannières/icônes non remplacés lors d'une publication partielle ; garder le repli global des anciennes cartes. Ne pas modifier les comptes, points, consentements, certificats ou notifications marketing. La signature prend déjà les fichiers publiés avant les fichiers par défaut.

Afficher un aperçu de l'icône enregistrée et clarifier « Logo Google Wallet (URL HTTPS facultative) ». Déployer sur Docker staging après tests et sauvegarde, sans production. Vérifier les fichiers du paquet signé et l'interface ; la réception et le rendu iPhone restent un contrôle physique.
