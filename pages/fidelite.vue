<template><div role="status">Ouverture de l’espace clients…</div></template>
<script>
export default {
  middleware: 'auth',
  asyncData({ redirect }) { return redirect('/clients?tab=programme') },
}
</script>
