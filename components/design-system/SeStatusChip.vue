<template>
  <v-chip
    small
    label
    :class="['se-status-chip', statusClass]"
    :aria-label="ariaLabel"
  >
    <v-icon v-if="iconName" x-small left>{{ iconName }}</v-icon>
    <slot>{{ resolvedLabel }}</slot>
  </v-chip>
</template>

<script>
const statusMap = {
  success: {
    className: 'se-status-chip--success',
    icon: 'mdi-check-circle',
    label: 'Valide',
  },
  warning: {
    className: 'se-status-chip--warning',
    icon: 'mdi-alert',
    label: 'Attention',
  },
  danger: {
    className: 'se-status-chip--danger',
    icon: 'mdi-alert-circle',
    label: 'Erreur',
  },
  info: {
    className: 'se-status-chip--info',
    icon: 'mdi-information-outline',
    label: 'Information',
  },
  neutral: {
    className: 'se-status-chip--neutral',
    icon: '',
    label: 'Neutre',
  },
}

export default {
  name: 'SeStatusChip',
  props: {
    status: {
      type: String,
      default: 'neutral',
    },
    label: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
  },
  computed: {
    statusConfig() {
      return statusMap[this.status] || statusMap.neutral
    },
    statusClass() {
      return this.statusConfig.className
    },
    resolvedLabel() {
      return this.label || this.statusConfig.label
    },
    iconName() {
      if (this.icon === 'none') return ''
      return this.icon || this.statusConfig.icon
    },
    ariaLabel() {
      return `Statut : ${this.resolvedLabel}`
    },
  },
}

export { statusMap }
</script>
