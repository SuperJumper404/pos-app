# pos-app

### ```Build with```
- [@nuxtjs.axios](https://www.npmjs.com/package/@nuxtjs/axios)
- [nuxt](https://nuxtjs.org/docs/2.x/get-started/installation)
- [vuex-easy-access](https://www.npmjs.com/package/vuex-easy-access)
- [Vuetify](https://vuetifyjs.com/en/getting-started/installation/#nuxt-install)


### ```Installing```
Clone project 
```
git clone https://github.com/tomimandalap/pos.git
```
```
npm install
```
or
```
yarn install
```

### ```Starting```
Create an **.env** file first before running this application.
```
  Please copy and paste it into your .env file.
  
  VUE_APP_BASEURL=http://localhost:5005 *
  
  Note: 
  * URL running on expressjs
  
```

To start use
```
npm run dev
```
or
```
yarn dev
```

---

### Regle d'impression : non bloquante

Cette regle s'applique a tous les tickets, aussi bien les tickets de caisse
que les tickets de commande :

- L'application envoie la demande au service d'impression et affiche uniquement
  une notification indiquant que l'impression a ete envoyee.
- L'interface ne doit pas attendre la reponse finale de l'imprimante, ni
  remonter son statut, son erreur ou son resultat a l'utilisateur.
- L'impression est un envoi fire-and-forget : elle ne doit jamais bloquer
  l'encaissement, l'envoi de commande ou la suite du parcours.
- Le bouton doit etre protege contre le spam pendant l'envoi, mais il ne doit
  pas rester bloque en attendant que le ticket sorte physiquement.
