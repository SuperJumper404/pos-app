<template>
  <v-chip
    v-if="visible"
    :x-small="!small"
    :small="small"
    :color="color"
    dark
  >
    <v-icon v-if="showIcon" :size="iconSize" left>{{ icon }}</v-icon>
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
    small: {
      type: Boolean,
      default: false,
    },
    showIcon: {
      type: Boolean,
      default: false,
    },
    iconSize: {
      type: [Number, String],
      default: 18,
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
      return this.isTakeaway ? 'warning' : 'primary'
    },
    icon() {
      return this.isTakeaway ? 'mdi-basket' : 'mdi-silverware-fork-knife'
    },
  },
}
</script>
