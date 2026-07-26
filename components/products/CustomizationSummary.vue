<template>
  <div class="customization-summary">
    <div
      v-for="(group, groupIndex) in groups"
      :key="group.stepId || `${group.stepName}-${groupIndex}`"
      class="customization-summary__group mb-3"
    >
      <div class="d-flex align-center mb-1">
        <span class="font-weight-bold">{{ group.stepName }}</span>
        <v-spacer></v-spacer>
        <v-btn
          v-if="canEditGroup(group)"
          text
          x-small
          color="primary"
          class="text-none"
          @click="editGroup(group)"
        >
          Modifier
        </v-btn>
      </div>
      <div class="d-flex flex-wrap customization-summary__choices">
        <v-chip
          v-for="(choice, choiceIndex) in group.choices"
          :key="choiceKey(choice, choiceIndex)"
          small
          outlined
          class="mr-2 mb-2"
        >
          {{ choiceName(choice) }}
          <span v-if="choiceSupplement(choice) !== 0" class="ml-1">
            (+{{ formattedPrice(choiceSupplement(choice)) }} €)
          </span>
        </v-chip>
      </div>
    </div>

    <p v-if="groups.length === 0" class="grey--text mb-3">
      Aucune option sélectionnée.
    </p>

    <template v-if="showTotal">
      <v-divider class="mb-3"></v-divider>
      <div class="d-flex justify-space-between align-center text-subtitle-1">
        <span class="font-weight-bold">Total</span>
        <span class="font-weight-bold primary--text">
          {{ formattedPrice(unitPrice) }} €
        </span>
      </div>
    </template>
  </div>
</template>

<script>
import { formatPrice, parsePrice } from '@/helpers/price'

export default {
  name: 'CustomizationSummary',
  props: {
    groups: {
      type: Array,
      default: () => [],
    },
    editable: {
      type: Boolean,
      default: false,
    },
    showTotal: {
      type: Boolean,
      default: false,
    },
    unitPrice: {
      type: [Number, String],
      default: 0,
    },
  },
  methods: {
    canEditGroup(group) {
      return this.editable && group && group.stepId != null
    },
    editGroup(group) {
      if (!this.canEditGroup(group)) return
      this.$emit('edit', group.stepId)
    },
    choiceKey(choice, index) {
      return choice.product_step_choice_id || choice.choice_id || index
    },
    choiceName(choice) {
      return choice.choice_name || choice.name || 'Choix'
    },
    choiceSupplement(choice) {
      return parsePrice(
        choice.extra_price == null
          ? choice.unit_extra_price == null
            ? choice.price
            : choice.unit_extra_price
          : choice.extra_price
      )
    },
    formattedPrice(value) {
      return formatPrice(value)
    },
  },
}
</script>

<style scoped>
.customization-summary__group {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.customization-summary__choices {
  gap: 2px;
}
</style>
