const listdashboard = {
  computed: {
    shopId() {
      return localStorage.getItem('shopid') // string ou null
    },
    shop_name() {
      return this.$store.get('shop/shop_name')
    },
    list() {
      const shopId = this.shopId
      const shopName = this.shop_name
        ? encodeURIComponent(this.shop_name)
        : null

      return [
        {
          icon: 'mdi-home',
          title: 'Accueil',
          routeName: 'index',
          to: '/',
          isAdmin: true,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Produits',
          routeName: 'products',
          to: '/products',
          isAdmin: true,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Modification produit',
          routeName: 'products-edit-id',
          isAdmin: false,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Ajouter un nouveau produit',
          routeName: 'products-newproduct',
          isAdmin: false,
        },
        {
          icon: 'mdi-bookmark',
          title: 'Catégories',
          routeName: 'categories',
          to: '/categories',
          isAdmin: true,
        },
        {
          icon: 'mdi-food',
          title: 'Menus',
          routeName: 'menus',
          to: '/menus',
          isAdmin: true,
        },
        {
          icon: 'mdi-basket-check',
          title: 'Commande',
          routeName: 'cart',
        },
        {
          icon: 'mdi-order-bool-descending',
          title: 'Commandes',
          routeName: 'orders',
          to: '/orders',
          isAdmin: true,
        },
        {
          icon: 'mdi-cash-register',
          title: 'Tiroir-caisse',
          routeName: 'cashregister',
          to: '/cashregister',
          isAdmin: true,
        },
        {
          icon: 'mdi-history',
          title: 'Historique',
          routeName: 'history',
          to: '/history',
          isAdmin: true,
        },
        {
          icon: 'mdi-apps',
          title: 'Stocks',
          routeName: 'stocks',
          to: '/stocks',
          isAdmin: true,
        },
        {
          icon: 'mdi-notebook',
          title: 'Rapports',
          routeName: 'reports',
          to: '/reports',
          isAdmin: true,
        },
        {
          icon: 'mdi-table-chair',
          title: 'Tables',
          routeName: 'tables',
          to: '/tables',
          isAdmin: true,
        },
        {
          icon: 'mdi-store-cog',
          title: 'Réglages',
          routeName: 'settings',
          to: '/settings',
          isAdmin: true,
        },

        {
          icon: 'mdi-web',
          title: 'Mon site web',
          to:
            shopId && shopName
              ? `/click-and-collect/${shopId}/${shopName}`
              : '/click-and-collect',
          isAdmin: true,
        },

        {
          icon: 'mdi-logout',
          name: 'logout',
          title: 'Déconnexion',
          isAdmin: true,
        },
      ]
    },
  },
}

export default listdashboard
