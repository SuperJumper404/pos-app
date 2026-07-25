<template>
  <v-alert type="info" outlined dense class="mb-4">
    <div class="d-flex align-center flex-wrap">
      <strong>Modification de la commande #{{ orderNumber }}</strong>
      <v-spacer />
      <v-btn text small class="text-none" @click="$emit('cancel')">
        Annuler la modification
      </v-btn>
    </div>
  </v-alert>
</template>

<script>
export default {
  props: {
    orderNumber: {
      type: String,
      required: true,
    },
  },
}
</script>
