<template>
  <v-chip
    v-if="visible"
    class="takeaway-chip order-chip order-chip--service"
    :x-small="!small"
    :small="small"
    :color="color"
    dark
  >
    <v-icon
      v-if="showIcon"
      :size="normalizedIconSize"
      left
      class="order-payment-chip-icon takeaway-chip__icon"
    >
      {{ icon }}
    </v-icon>
    <span class="takeaway-chip__label">{{ label }}</span>
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
    normalizedIconSize() {
      return this.iconSize || 16
    },
  },
}
</script>

<style scoped>
.takeaway-chip {
  border-radius: 999px !important;
  font-size: 0.74rem !important;
  font-weight: 900 !important;
  height: 28px !important;
  letter-spacing: 0;
  min-height: 28px;
  overflow: visible;
  padding: 0 12px !important;
}

.takeaway-chip ::v-deep .v-chip__content,
.takeaway-chip .v-icon {
  color: inherit !important;
}

.order-chip--service {
  background: #ff9f0a !important;
  color: #ffffff !important;
}

.order-payment-chip-icon {
  flex: 0 0 auto;
  margin-left: -1px !important;
  margin-right: 6px !important;
  overflow: visible;
}

.takeaway-chip__icon {
  max-width: none;
}

.takeaway-chip__label {
  line-height: 1;
  white-space: nowrap;
}
</style>
