<template>
  <v-chip v-if="visible" x-small :color="color" dark>
    {{ label }}
  </v-chip>
</template>

<script>
export default {
  props: {
    value: {
      type: [Boolean, Number, String],
      default: false,
    },
    showDineIn: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isTakeaway() {
      return [true, 1, '1'].includes(this.value)
    },
    visible() {
      return this.isTakeaway || this.showDineIn
    },
    label() {
      return this.isTakeaway ? 'À emporter' : 'Sur place'
    },
    color() {
      return this.isTakeaway ? 'orange darken-1' : 'blue-grey darken-1'
    },
  },
}
</script>
