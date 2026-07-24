<template>
  <div class="customization-summary">
    <div
      v-for="group in groupedSelections"
      :key="group.stepName"
      class="customization-summary__group mb-3"
    >
      <div class="d-flex align-center mb-1">
        <span class="font-weight-bold">{{ group.stepName }}</span>
        <v-spacer></v-spacer>
        <v-btn
          v-if="group.choices[0] && group.choices[0].product_step_id != null"
          text
          x-small
          color="primary"
          class="text-none"
          @click="$emit('edit', group.choices[0].product_step_id)"
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

    <p v-if="groupedSelections.length === 0" class="grey--text mb-3">
      Aucune option sélectionnée.
    </p>

    <v-divider class="mb-3"></v-divider>
    <div class="d-flex justify-space-between align-center text-subtitle-1">
      <span class="font-weight-bold">Total</span>
      <span class="font-weight-bold primary--text">
        {{ formattedPrice(unitPrice) }} €
      </span>
    </div>
  </div>
</template>

<script>
import { formatPrice, parsePrice } from '@/helpers/price'

export default {
  name: 'CartCustomizationSummary',
  props: {
    selections: {
      type: Array,
      default: () => [],
    },
    unitPrice: {
      type: [Number, String],
      default: 0,
    },
  },
  computed: {
    groupedSelections() {
      const groups = new Map()
      for (const selection of this.selections || []) {
        const stepName = selection.step_name || 'Personnalisation'
        if (!groups.has(stepName)) {
          groups.set(stepName, { stepName, choices: [] })
        }
        groups.get(stepName).choices.push(selection)
      }
      return Array.from(groups.values())
    },
  },
  methods: {
    choiceKey(choice, index) {
      return choice.product_step_choice_id || choice.choice_id || index
    },
    choiceName(choice) {
      return choice.choice_name || choice.name || 'Choix'
    },
    choiceSupplement(choice) {
      return parsePrice(
        choice.extra_price == null
          ? choice.unit_extra_price
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
