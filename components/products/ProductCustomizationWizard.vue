<template>
  <v-card class="customization-wizard">
    <v-card-title class="customization-wizard__header d-flex align-center">
      <div>
        <div class="text-h6">{{ product.name || 'Personnalisation' }}</div>
        <div v-if="!isSummary" class="text-caption grey--text">
          Étape {{ currentStepNumber }} / {{ visibleStepCount }}
        </div>
        <div v-else class="text-caption grey--text">Résumé</div>
      </div>
      <v-spacer></v-spacer>
      <div class="text-right mr-2">
        <div class="text-caption grey--text">Prix actuel</div>
        <div class="font-weight-bold primary--text">
          {{ formatCurrency(previewUnitPrice) }}
        </div>
      </div>
      <v-btn icon aria-label="Fermer" @click="cancel">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-progress-linear
      :value="progressValue"
      color="primary"
      height="6"
    ></v-progress-linear>

    <v-card-text class="customization-wizard__body">
      <template v-if="currentStep && !isSummary">
        <h2 class="text-h5 mb-1">{{ currentStep.name || 'Étape' }}</h2>
        <p v-if="currentStep.description" class="grey--text mb-2">
          {{ currentStep.description }}
        </p>
        <p class="text-body-2 mb-4">{{ selectionInstruction }}</p>

        <v-alert
          v-if="blockingExplanation"
          type="warning"
          text
          prominent
          class="mb-4"
        >
          {{ blockingExplanation }}
        </v-alert>

        <div class="customization-wizard__choice-grid">
          <CustomizationChoiceCard
            v-for="choice in currentStepChoices"
            :key="choice.product_step_choice_id"
            :choice="choice"
            :selected="isChoiceSelected(choice)"
            @toggle="toggleChoice"
          />
        </div>
      </template>

      <template v-else>
        <h2 class="text-h5 mb-4">Votre sélection</h2>
        <CustomizationSummary
          :groups="summaryGroups"
          :unit-price="previewUnitPrice"
          editable
          show-total
          @edit="openStep"
        />
      </template>
    </v-card-text>

    <v-divider></v-divider>
    <v-card-actions class="customization-wizard__footer pa-4">
      <v-btn text class="text-none" @click="goBack">
        <v-icon left>mdi-arrow-left</v-icon>
        {{ backButtonLabel }}
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-if="!isSummary"
        color="primary"
        class="text-none"
        :disabled="continueDisabled"
        @click="goForward"
      >
        Continuer
        <v-icon right>mdi-arrow-right</v-icon>
      </v-btn>
      <v-btn
        v-else
        color="success"
        class="text-none"
        :disabled="!allStepsValid"
        @click="confirmCustomization"
      >
        Ajouter au panier
        <v-icon right>mdi-cart-plus</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import CustomizationChoiceCard from '@/components/products/CustomizationChoiceCard'
import CustomizationSummary from '@/components/products/CustomizationSummary'
import {
  calculatePreviewUnitPrice,
  findStepIndexById,
  groupCustomizationSelections,
  nextVisibleStepIndex,
  validateStep,
} from '@/helpers/customizations'

const isActive = (value) => ![false, 0, '0', 'false'].includes(value)

const normalizeIds = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  ).sort((left, right) => left - right)

export default {
  name: 'ProductCustomizationWizard',
  components: {
    CustomizationChoiceCard,
    CustomizationSummary,
  },
  props: {
    product: {
      type: Object,
      required: true,
    },
    value: {
      type: Array,
      default: () => [],
    },
    initialStepId: {
      type: [Number, String],
      default: null,
    },
  },
  data() {
    return {
      selectedChoiceIds: [],
      currentStepIndex: 0,
    }
  },
  computed: {
    summaryGroups() {
      return groupCustomizationSelections(this.selections)
    },
    steps() {
      return [...(this.product.customization_steps || [])].sort(
        (left, right) =>
          Number(left.position || 0) - Number(right.position || 0)
      )
    },
    visibleStepIndexes() {
      const indexes = []
      let index = nextVisibleStepIndex(this.steps, -1)
      while (index < this.steps.length) {
        indexes.push(index)
        index = nextVisibleStepIndex(this.steps, index)
      }
      return indexes
    },
    visibleStepCount() {
      return this.visibleStepIndexes.length
    },
    isSummary() {
      return this.currentStepIndex >= this.steps.length
    },
    currentStep() {
      return this.isSummary ? null : this.steps[this.currentStepIndex] || null
    },
    currentStepNumber() {
      if (this.isSummary) return this.visibleStepCount
      const visibleIndex = this.visibleStepIndexes.indexOf(
        this.currentStepIndex
      )
      return visibleIndex < 0 ? 1 : visibleIndex + 1
    },
    progressValue() {
      if (this.isSummary || this.visibleStepCount === 0) return 100
      return (this.currentStepNumber / this.visibleStepCount) * 100
    },
    backButtonLabel() {
      return this.currentStepNumber <= 1 && !this.isSummary
        ? 'Annuler'
        : 'Retour'
    },
    currentStepChoices() {
      return this.currentStep
        ? (this.currentStep.choices || []).filter((choice) =>
            isActive(choice.active)
          )
        : []
    },
    selectableChoiceIds() {
      const choiceIds = new Set()
      for (const step of this.steps) {
        if (!isActive(step.active)) continue
        for (const choice of step.choices || []) {
          if (this.choiceSelectable(choice)) {
            choiceIds.add(Number(choice.product_step_choice_id))
          }
        }
      }
      return choiceIds
    },
    minimumChoices() {
      return this.currentStep
        ? Number(this.currentStep.minimum_choices) || 0
        : 0
    },
    maximumChoices() {
      return this.currentStep
        ? Math.max(1, Number(this.currentStep.maximum_choices) || 1)
        : 1
    },
    selectedForCurrentStep() {
      const stepChoiceIds = new Set(
        this.currentStepChoices.map((choice) =>
          Number(choice.product_step_choice_id)
        )
      )
      return this.selectedChoiceIds.filter(
        (choiceId) =>
          stepChoiceIds.has(choiceId) && this.selectableChoiceIds.has(choiceId)
      )
    },
    currentStepValidation() {
      if (!this.currentStep) return { valid: true, reason: null }
      return validateStep(this.currentStep, this.selectedForCurrentStep)
    },
    continueDisabled() {
      return !this.currentStepValidation.valid
    },
    selectionInstruction() {
      if (this.minimumChoices === 0) {
        return this.maximumChoices === 1
          ? 'Choisissez une option si vous le souhaitez.'
          : `Choisissez jusqu’à ${this.maximumChoices} options.`
      }
      if (this.minimumChoices === this.maximumChoices) {
        return `Choisissez ${this.minimumChoices} option(s).`
      }
      return `Choisissez entre ${this.minimumChoices} et ${this.maximumChoices} options.`
    },
    blockingExplanation() {
      if (!this.currentStep || this.minimumChoices === 0) return null
      const availableCount = this.currentStepChoices.filter((choice) =>
        this.choiceSelectable(choice)
      ).length
      if (availableCount >= this.minimumChoices) return null
      return 'Cette étape ne propose pas assez de choix disponibles. Ce produit ne peut pas être commandé pour le moment.'
    },
    validSelectedChoiceIds() {
      return this.selectedChoiceIds.filter((choiceId) =>
        this.selectableChoiceIds.has(choiceId)
      )
    },
    previewUnitPrice() {
      return calculatePreviewUnitPrice(
        this.product,
        this.validSelectedChoiceIds
      )
    },
    selections() {
      const selectedIds = new Set(this.validSelectedChoiceIds)
      const selections = []
      for (const step of this.steps) {
        for (const choice of step.choices || []) {
          const choiceId = Number(choice.product_step_choice_id)
          if (!selectedIds.has(choiceId)) continue
          selections.push({
            ...choice,
            product_step_choice_id: choiceId,
            product_step_id: step.product_step_id,
            step_id: step.step_id,
            step_name: step.name || 'Personnalisation',
            step_position: Number(step.position || 0),
            choice_name: choice.choice_name || choice.name || 'Choix',
            choice_position: Number(choice.position || 0),
          })
        }
      }
      return selections
    },
    allStepsValid() {
      return this.visibleStepIndexes.every((stepIndex) => {
        const step = this.steps[stepIndex]
        const choiceIds = new Set(
          (step.choices || [])
            .map((choice) => Number(choice.product_step_choice_id))
            .filter((choiceId) => this.selectableChoiceIds.has(choiceId))
        )
        const selectedIds = this.validSelectedChoiceIds.filter((choiceId) =>
          choiceIds.has(choiceId)
        )
        return validateStep(step, selectedIds).valid
      })
    },
    confirmationPayload() {
      return {
        selectedChoiceIds: [...this.validSelectedChoiceIds],
        unitPrice: this.previewUnitPrice,
        selections: this.selections.map((selection) => ({ ...selection })),
      }
    },
  },
  watch: {
    value: {
      immediate: true,
      deep: true,
      handler(value) {
        this.selectedChoiceIds = this.sanitizeSelection(value)
      },
    },
    product: {
      immediate: true,
      handler() {
        this.selectedChoiceIds = this.sanitizeSelection(this.value)
        this.resetWizardPosition()
      },
    },
    initialStepId() {
      this.resetWizardPosition()
    },
  },
  methods: {
    choiceSelectable(choice) {
      if (!choice || !isActive(choice.active)) return false
      if (choice.choice_type === 'linked_product') {
        return choice.available !== false
      }
      return true
    },
    sanitizeSelection(values) {
      return normalizeIds(values).filter((choiceId) =>
        this.selectableChoiceIds.has(choiceId)
      )
    },
    resetWizardPosition() {
      const requestedIndex = findStepIndexById(this.steps, this.initialStepId)
      if (
        this.initialStepId != null &&
        requestedIndex >= 0 &&
        isActive(this.steps[requestedIndex].active)
      ) {
        this.currentStepIndex = requestedIndex
        return
      }
      this.currentStepIndex = nextVisibleStepIndex(this.steps, -1)
    },
    isChoiceSelected(choice) {
      const choiceId = Number(choice.product_step_choice_id)
      return (
        this.selectableChoiceIds.has(choiceId) &&
        this.selectedChoiceIds.includes(choiceId)
      )
    },
    setSelection(selection) {
      const normalizedSelection = this.sanitizeSelection(selection)
      this.selectedChoiceIds = normalizedSelection
      this.$emit('input', [...normalizedSelection])
    },
    toggleChoice(choiceId) {
      const normalizedChoiceId = Number(choiceId)
      const choice = this.currentStepChoices.find(
        (candidate) =>
          Number(candidate.product_step_choice_id) === normalizedChoiceId
      )
      if (!choice || !this.choiceSelectable(choice)) return

      const stepChoiceIds = new Set(
        this.currentStepChoices
          .map((candidate) => Number(candidate.product_step_choice_id))
          .filter((candidateId) => this.selectableChoiceIds.has(candidateId))
      )
      const selectedInStep = this.selectedChoiceIds.filter((selectedId) =>
        stepChoiceIds.has(selectedId)
      )
      let selection = this.selectedChoiceIds.filter(
        (selectedId) => !stepChoiceIds.has(selectedId)
      )

      if (this.maximumChoices === 1) {
        selection.push(normalizedChoiceId)
      } else if (selectedInStep.includes(normalizedChoiceId)) {
        selection = selection.concat(
          selectedInStep.filter(
            (selectedId) => selectedId !== normalizedChoiceId
          )
        )
      } else if (selectedInStep.length < this.maximumChoices) {
        selection = selection.concat(selectedInStep, normalizedChoiceId)
      } else {
        selection = selection.concat(selectedInStep)
      }

      this.setSelection(selection)
    },
    goForward() {
      if (this.continueDisabled) return
      this.currentStepIndex = nextVisibleStepIndex(
        this.steps,
        this.currentStepIndex
      )
    },
    goBack() {
      if (this.visibleStepIndexes.length === 0) {
        this.cancel()
        return
      }
      if (this.isSummary) {
        this.currentStepIndex =
          this.visibleStepIndexes[this.visibleStepIndexes.length - 1]
        return
      }
      const visibleIndex = this.visibleStepIndexes.indexOf(
        this.currentStepIndex
      )
      if (visibleIndex <= 0) {
        this.cancel()
        return
      }
      this.currentStepIndex = this.visibleStepIndexes[visibleIndex - 1]
    },
    openStep(productStepId) {
      const stepIndex = findStepIndexById(this.steps, productStepId)
      if (stepIndex >= 0) this.currentStepIndex = stepIndex
    },
    confirmCustomization() {
      if (!this.allStepsValid) {
        const invalidIndex = this.visibleStepIndexes.find((stepIndex) => {
          const step = this.steps[stepIndex]
          const stepChoiceIds = new Set(
            (step.choices || [])
              .map((choice) => Number(choice.product_step_choice_id))
              .filter((choiceId) => this.selectableChoiceIds.has(choiceId))
          )
          return !validateStep(
            step,
            this.validSelectedChoiceIds.filter((choiceId) =>
              stepChoiceIds.has(choiceId)
            )
          ).valid
        })
        if (invalidIndex != null) this.currentStepIndex = invalidIndex
        return
      }
      this.$emit('confirm', this.confirmationPayload)
    },
    cancel() {
      this.$emit('cancel')
    },
    formatCurrency(value) {
      return `${Number(value || 0).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} €`
    },
  },
}
</script>

<style scoped>
.customization-wizard {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  overflow: hidden;
}

.customization-wizard__header,
.customization-wizard__footer {
  flex: 0 0 auto;
}

.customization-wizard__body {
  flex: 1 1 auto;
  min-height: 360px;
  overflow-y: auto;
  padding-top: 24px;
}

.customization-wizard__choice-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

@media (max-width: 599px) {
  .customization-wizard__body {
    min-height: 300px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .customization-wizard__choice-grid {
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
