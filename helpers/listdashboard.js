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
          moduleKey: 'home',
          isAdmin: true,
        },
        {
          icon: 'mdi-chart-box-outline',
          title: 'Mes statistiques',
          routeName: 'statistics',
          to: '/statistics',
          moduleKey: 'home',
          isAdmin: true,
        },
        {
          icon: 'mdi-bookmark',
          title: 'Catégories',
          routeName: 'categories',
          to: '/categories',
          moduleKey: 'categories',
          hiddenFromMainNavigation: true,
          isAdmin: false,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Ajouter un nouvelle catégorie',
          routeName: 'categories-newcategory',
          isAdmin: false,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Produits',
          routeName: 'products',
          to: '/products',
          moduleKey: 'catalog',
          legacyModuleKey: 'products',
          isAdmin: true,
        },
        {
          icon: 'mdi-format-list-numbered',
          title: 'Étapes produits',
          routeName: 'customizations',
          to: '/customizations',
          hiddenFromMainNavigation: true,
          isAdmin: false,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Modifier le produit',
          routeName: 'products-edit-id',
          isAdmin: false,
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Supprimer le produit',
          routeName: 'products-delete-id',
        },
        {
          icon: 'mdi-shape-plus',
          title: 'Ajouter un nouveau produit',
          routeName: 'products-newproduct',
          isAdmin: false,
        },
        {
          icon: 'mdi-food',
          title: 'Menus',
          routeName: 'menus',
          to: '/menus',
          moduleKey: 'orders',
          legacyModuleKey: 'menus',
          isAdmin: true,
        },
        {
          icon: 'mdi-basket-check',
          title: 'Commande',
          routeName: 'cart',
          moduleKey: 'cart',
        },
        {
          icon: 'mdi-order-bool-descending',
          title: 'Commandes',
          routeName: 'orders',
          to: '/orders',
          moduleKey: 'orders',
          isAdmin: true,
        },
        {
          icon: 'mdi-order-bool-descending',
          title: 'Détail de la commande',
          routeName: 'orders-detail-id',
        },
        {
          icon: 'mdi-cash-register',
          title: 'Tiroir-caisse',
          routeName: 'cashregister',
          to: '/cashregister',
          moduleKey: 'cashregister',
          isAdmin: true,
        },
        {
          icon: 'mdi-cash-register',
          title: 'Detail du tiroir-caisse',
          routeName: 'cashregister-details-id',
        },
        {
          icon: 'mdi-cash-register',
          title: 'Encaisser la table',
          routeName: 'cashregister-payout-id',
        },
        {
          icon: 'mdi-history',
          title: 'Historique',
          routeName: 'history',
          to: '/history',
          moduleKey: 'history',
          isAdmin: true,
        },
        {
          icon: 'mdi-account-multiple',
          title: 'Mes clients',
          routeName: 'clients',
          to: '/clients',
          moduleKey: 'clients',
          isAdmin: true,
        },
        {
          icon: 'mdi-receipt-text-check-outline',
          title: 'Ticket de caisse',
          routeName: 'history-ticket-id',
        },
        {
          icon: 'mdi-apps',
          title: 'Stocks',
          routeName: 'stocks',
          to: '/stocks',
          moduleKey: 'stocks',
          isAdmin: false,
        },
        {
          icon: 'mdi-notebook',
          title: 'Rapports',
          routeName: 'reports',
          to: '/reports',
          moduleKey: 'reports',
          isAdmin: false,
        },
        {
          icon: 'mdi-account-group',
          title: 'Staff / Equipe',
          routeName: 'staff',
          to: '/staff',
          moduleKey: 'staff',
          isAdmin: true,
        },
        {
          icon: 'mdi-table-chair',
          title: 'Tables',
          routeName: 'tables',
          to: '/tables',
          moduleKey: 'tables',
          isAdmin: true,
        },
        {
          icon: 'mdi-table-chair',
          title: 'Ajouter une nouvelle table',
          routeName: 'tables-newtable',
        },
        {
          icon: 'mdi-table-chair',
          title: 'Supprimer la table',
          routeName: 'tables-delete-id',
        },
        {
          icon: 'mdi-store-cog',
          title: 'Réglages',
          routeName: 'settings',
          to: '/settings',
          moduleKey: 'settings',
          isAdmin: true,
        },

        {
          icon: 'mdi-web',
          title: 'Mon site web',
          to:
            shopId && shopName
              ? `/click-and-collect/${shopId}/${shopName}`
              : '/click-and-collect',
          moduleKey: 'website',
          isAdmin: true,
        },

        {
          icon: 'mdi-tablet-dashboard',
          title: 'Borne',
          routeName: 'borne',
          to: '/borne',
          moduleKey: 'borne',
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
