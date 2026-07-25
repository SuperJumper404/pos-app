<template>
  <v-chip v-if="visible" x-small color="orange darken-1" dark>
    À emporter
  </v-chip>
</template>

<script>
export default {
  props: {
    value: {
      type: [Boolean, Number, String],
      default: false,
    },
  },
  computed: {
    visible() {
      return [true, 1, '1'].includes(this.value)
    },
  },
}
</script>
