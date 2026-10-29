# Tickets, encaissement et délai TPE

**But :** imprimer le ticket carte d'un paiement TPE libre confirmé depuis une page dédiée, ouvrir les commandes jointes avec une icône, proposer le TPE dans les fenêtres d'encaissement dont `/caisse/menu`, afficher son nom et arrêter l'attente de carte après 12 secondes.

**Contraintes :** réutiliser les circuits d'impression et de paiement actuels. Ne créer aucune commande pour un paiement libre. Ne jamais considérer un paiement comme encaissé avant confirmation Stripe, ni libérer une autorisation incertaine. Le délai concerne l'attente sur le lecteur ; la confirmation engagée auprès de Stripe est rapprochée avant libération. Conserver la reprise après fermeture et les liens purement informatifs.

- [x] Page de ticket carte et accès depuis le paiement confirmé/l'historique ; pièce jointe iconique accessible.
- [x] Encaissement TPE depuis les parcours caisse et les fenêtres existantes ; nom du lecteur dans les choix et tickets.
- [x] Délai serveur de 12 secondes, rapprochement sûr et nettoyage en arrière-plan.
- [x] Tests ciblés et suites complètes frontend/backend, lint sans erreur, aperçu/téléchargement PDF vérifiés en navigateur bureau/mobile, migration vérifiée sur schéma MySQL QA isolé.

La relecture a corrigé la reprise d'une création interrompue (seuil distinct de 30 secondes), la conservation du nom du lecteur lors d'une réimpression et le contrôle asynchrone d'envoi à l'imprimante. Les autres impressions restent non bloquantes. La migration staging est appliquée après sauvegarde ; le déploiement frontend et le contrôle réel du délai suivent les suites réussies.
