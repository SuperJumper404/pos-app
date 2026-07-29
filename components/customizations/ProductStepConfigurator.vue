<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <div>
        <h2 class="text-h6">Étapes de personnalisation</h2>
        <p class="text-body-2 grey--text text--darken-1 mb-0">
          Attachez des étapes partagées et adaptez leurs contraintes à ce
          produit.
        </p>
      </div>
      <v-btn
        color="success"
        class="text-none"
        :disabled="attachableSteps.length === 0"
        @click="attachDialog = true"
      >
        <v-icon left>mdi-plus</v-icon>
        Ajouter une étape
      </v-btn>
    </div>

    <v-alert v-if="localValue.length === 0" text type="info">
      Ce produit ne contient aucune étape de personnalisation.
    </v-alert>

    <v-card
      v-for="(configuredStep, stepIndex) in localValue"
      :key="configuredStep.step_id"
      outlined
      class="mb-4"
    >
      <v-card-title class="d-flex flex-wrap align-center">
        <span>{{ stepName(configuredStep) }}</span>
        <v-spacer></v-spacer>
        <v-btn
          icon
          :disabled="stepIndex === 0"
          aria-label="Monter l'étape"
          @click="moveStep(stepIndex, -1)"
        >
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>
        <v-btn
          icon
          :disabled="stepIndex === localValue.length - 1"
          aria-label="Descendre l'étape"
          @click="moveStep(stepIndex, 1)"
        >
          <v-icon>mdi-arrow-down</v-icon>
        </v-btn>
        <v-btn
          icon
          color="error"
          aria-label="Retirer l'étape"
          @click="removeStep(stepIndex)"
        >
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="configuredStep.minimum_choices"
              label="Choix minimum"
              type="number"
              min="0"
              step="1"
              @input="configurationChanged"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="configuredStep.maximum_choices"
              label="Choix maximum"
              type="number"
              min="1"
              step="1"
              @input="configurationChanged"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="4">
            <v-switch
              v-model="configuredStep.active"
              label="Étape active"
              color="success"
              inset
              @change="configurationChanged"
            ></v-switch>
          </v-col>
        </v-row>

        <v-alert
          v-for="error in errorsForStep(configuredStep)"
          :key="error"
          dense
          text
          type="error"
          class="mb-2"
        >
          {{ error }}
        </v-alert>

        <v-simple-table>
          <thead>
            <tr>
              <th>Choix proposé</th>
              <th class="text-center">Actif</th>
              <th>Supplément</th>
              <th class="text-right">Ordre</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(configuredChoice, choiceIndex) in configuredStep.choices"
              :key="configuredChoice.step_choice_id"
            >
              <td>
                <div class="font-weight-medium">
                  {{ choiceName(configuredStep, configuredChoice) }}
                </div>
                <small class="grey--text">
                  {{ choiceType(configuredStep, configuredChoice) }}
                </small>
                <small class="d-block grey--text">
                  Prix par défaut :
                  {{ defaultChoicePrice(configuredStep, configuredChoice) }} €
                </small>
              </td>
              <td class="text-center">
                <v-switch
                  v-model="configuredChoice.active"
                  color="success"
                  class="d-inline-flex"
                  hide-details
                  inset
                  @change="configurationChanged"
                ></v-switch>
              </td>
              <td>
                <v-text-field
                  v-model="configuredChoice.extra_price"
                  type="number"
                  step="0.01"
                  suffix="€"
                  hide-details
                  @input="configurationChanged"
                ></v-text-field>
              </td>
              <td class="text-right text-no-wrap">
                <v-btn
                  icon
                  small
                  :disabled="choiceIndex === 0"
                  aria-label="Monter le choix"
                  @click="moveChoice(configuredStep, choiceIndex, -1)"
                >
                  <v-icon small>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  :disabled="choiceIndex === configuredStep.choices.length - 1"
                  aria-label="Descendre le choix"
                  @click="moveChoice(configuredStep, choiceIndex, 1)"
                >
                  <v-icon small>mdi-arrow-down</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-simple-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="attachDialog" max-width="520">
      <v-card>
        <v-card-title>Ajouter une étape partagée</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedStepId"
            :items="attachableSteps"
            item-value="id"
            item-text="name"
            label="Étape"
            clearable
          ></v-select>
          <v-alert v-if="attachableSteps.length === 0" dense text type="info">
            Toutes les étapes actives sont déjà attachées à ce produit.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closeAttachDialog">
            Annuler
          </v-btn>
          <v-btn
            color="primary"
            class="text-none"
            :disabled="!selectedStepId"
            @click="attachSelectedStep"
          >
            Ajouter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
const clone = (value) => JSON.parse(JSON.stringify(value || []))

const isActive = (value) => ![false, 0, '0', 'false'].includes(value)

export default {
  name: 'ProductStepConfigurator',
  props: {
    value: {
      type: Array,
      default: () => [],
    },
    availableSteps: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      localValue: [],
      attachDialog: false,
      selectedStepId: null,
    }
  },
  computed: {
    attachedStepIds() {
      return new Set(this.localValue.map((step) => Number(step.step_id)))
    },
    attachableSteps() {
      return this.availableSteps.filter(
        (step) => step.active && !this.attachedStepIds.has(Number(step.id))
      )
    },
    validationErrors() {
      return this.localValue.reduce(
        (errors, step) => errors.concat(this.errorsForStep(step)),
        []
      )
    },
  },
  watch: {
    value: {
      immediate: true,
      deep: true,
      handler(value) {
        this.localValue = clone(value).map((step, stepIndex) => ({
          ...step,
          step_id: Number(step.step_id),
          position: stepIndex,
          minimum_choices: Number(step.minimum_choices),
          maximum_choices: Number(step.maximum_choices),
          active: isActive(step.active),
          choices: (step.choices || []).map((choice, choiceIndex) => ({
            ...choice,
            step_choice_id: Number(choice.step_choice_id),
            position: choiceIndex,
            extra_price:
              choice.extra_price == null
                ? this.defaultChoicePrice(step, choice)
                : choice.extra_price,
            active: isActive(choice.active),
          })),
        }))
        this.emitValidity()
      },
    },
  },
  methods: {
    libraryStep(configuredStep) {
      return this.availableSteps.find(
        (step) => Number(step.id) === Number(configuredStep.step_id)
      )
    },
    libraryChoice(configuredStep, configuredChoice) {
      const step = this.libraryStep(configuredStep)
      return (
        step &&
        (step.choices || []).find(
          (choice) =>
            Number(choice.id) === Number(configuredChoice.step_choice_id)
        )
      )
    },
    stepName(configuredStep) {
      const step = this.libraryStep(configuredStep)
      return (step && step.name) || configuredStep.name || 'Étape'
    },
    choiceName(configuredStep, configuredChoice) {
      const choice = this.libraryChoice(configuredStep, configuredChoice)
      return (
        (choice && choice.name) ||
        configuredChoice.name ||
        configuredChoice.choice_name ||
        'Choix'
      )
    },
    choiceType(configuredStep, configuredChoice) {
      const choice = this.libraryChoice(configuredStep, configuredChoice)
      const type =
        (choice && choice.choice_type) || configuredChoice.choice_type
      return type === 'linked_product' ? 'Produit lié' : 'Choix simple'
    },
    defaultChoicePrice(configuredStep, configuredChoice) {
      const choice = this.libraryChoice(configuredStep, configuredChoice)
      const price =
        choice && choice.default_extra_price != null
          ? choice.default_extra_price
          : configuredChoice.default_extra_price
      return price == null || price === '' ? '0.00' : String(price)
    },
    errorsForStep(step) {
      const errors = []
      const minimum = Number(step.minimum_choices)
      const maximum = Number(step.maximum_choices)
      if (!Number.isInteger(minimum) || minimum < 0) {
        errors.push('Le minimum doit être un entier positif ou nul.')
      }
      if (!Number.isInteger(maximum) || maximum < 1) {
        errors.push('Le maximum doit être un entier supérieur ou égal à 1.')
      }
      if (
        Number.isInteger(minimum) &&
        Number.isInteger(maximum) &&
        minimum > maximum
      ) {
        errors.push('Le minimum ne peut pas dépasser le maximum.')
      }
      const activeChoiceCount = (step.choices || []).filter((choice) =>
        isActive(choice.active)
      ).length
      if (Number.isInteger(minimum) && activeChoiceCount < minimum) {
        errors.push(
          `Seulement ${activeChoiceCount} choix actif(s) pour un minimum de ${minimum}.`
        )
      }
      return errors
    },
    emitValidity() {
      this.$nextTick(() => {
        this.$emit('validity-change', {
          valid: this.validationErrors.length === 0,
          errors: [...this.validationErrors],
        })
      })
    },
    configurationChanged() {
      const value = this.localValue.map((step, stepIndex) => ({
        ...step,
        position: stepIndex,
        choices: (step.choices || []).map((choice, choiceIndex) => ({
          ...choice,
          position: choiceIndex,
        })),
      }))
      this.localValue = value
      this.$emit('input', clone(value))
      this.emitValidity()
    },
    moveStep(index, offset) {
      const target = index + offset
      if (target < 0 || target >= this.localValue.length) return
      const value = [...this.localValue]
      const [step] = value.splice(index, 1)
      value.splice(target, 0, step)
      this.localValue = value
      this.configurationChanged()
    },
    moveChoice(step, index, offset) {
      const target = index + offset
      if (target < 0 || target >= step.choices.length) return
      const choices = [...step.choices]
      const [choice] = choices.splice(index, 1)
      choices.splice(target, 0, choice)
      this.$set(step, 'choices', choices)
      this.configurationChanged()
    },
    removeStep(index) {
      this.localValue.splice(index, 1)
      this.configurationChanged()
    },
    attachSelectedStep() {
      const step = this.attachableSteps.find(
        (candidate) => Number(candidate.id) === Number(this.selectedStepId)
      )
      if (!step) return
      this.localValue.push({
        step_id: Number(step.id),
        position: this.localValue.length,
        minimum_choices: 0,
        maximum_choices: Math.max(1, (step.choices || []).length),
        active: true,
        choices: (step.choices || []).map((choice, choiceIndex) => ({
          step_choice_id: Number(choice.id),
          position: choiceIndex,
          extra_price:
            choice.default_extra_price == null
              ? '0.00'
              : choice.default_extra_price,
          active: choice.active !== false,
        })),
      })
      this.closeAttachDialog()
      this.configurationChanged()
    },
    closeAttachDialog() {
      this.attachDialog = false
      this.selectedStepId = null
    },
  },
}
</script>
