export default function ({ $axios, redirect, store, router }) {
  $axios.onError((error) => {
    if (error.response.status === 401) {
      console.log('Store Instance', store)
      localStorage.removeItem('idUser')
      localStorage.removeItem('access')
      localStorage.removeItem('token')
      localStorage.removeItem('shopid')
      localStorage.removeItem('vuex')
      //   await store.dispatch('set/user.id', null)
      //   await store.dispatch('set/user.access', null)
      //   await store.dispatch('set/user.token', null)
      //   await store.dispatch('set/alertSuccess', true)
      //   await store.dispatch('set/user.shopid', null)
      //   await router.push('/login')
      redirect('/login')
    }
  })
}
