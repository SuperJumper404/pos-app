# Nom du restaurant et titre des notifications Wallet

L'utilisateur demande « le nom du resto : + un titre » à la place de l'intitulé générique Fidélité. Utiliser le vrai nom du restaurant, lu côté serveur, comme `organizationName` Apple ; conserver le nom du programme sur la carte. Ajouter un titre à chaque préparation de notification. Le choix d'un titre par envoi est l'hypothèse annoncée, dans l'attente d'une éventuelle correction utilisateur.

Le titre (80 caractères maximum, une ligne) et le message forment le texte immuable de la campagne, séparés par un saut de ligne. Conserver la limite totale existante de 200 caractères, le stockage SQL et le worker actuels ; aucune migration nécessaire. Le client affiche les limites et empêche de confirmer un brouillon dont le titre ou le message a changé. Les anciens appels sans titre restent compatibles ; l'éditeur propose le nouveau champ pour les nouveaux envois.

Préserver la sélection figée des destinataires, le consentement facultatif et ses versions, le délai de cinq minutes, l'idempotence et la confirmation de l'envoi. Ne créer ni campagne ni notification de test sur staging. Les tests de transport utilisent des fakes locaux. Le restaurant et les autres informations privées du client restent isolés par `shopid`.

Apple contrôle la présentation finale. L'en-tête identifie le restaurant ; le titre est placé au début du message de changement du pass. Ne pas promettre un sous-titre iOS indépendant. Déployer Docker backend/frontend sur staging seulement, avec sauvegarde et vérification du fichier signé et de l'interface.
