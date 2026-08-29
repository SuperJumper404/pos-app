export default function ({ store, redirect }) {
  const user = (store.state.users && store.state.users.user) || {}
  const access = Number(user.access)
  const staffAccess = [0, 1, 4, 5].includes(access)
  if (user.session_subject === 'service_point' || !staffAccess) {
    return redirect('/menus')
  }
  if (access === 0) return
  if (
    !Array.isArray(user.module_permissions) ||
    !user.module_permissions.includes('stocks')
  ) {
    return redirect('/')
  }
}
