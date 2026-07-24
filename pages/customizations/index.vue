<template>
  <v-container fluid>
    <v-card outlined class="mt-5">
      <v-toolbar flat color="grey lighten-4">
        <div>
          <v-toolbar-title>Étapes produits</v-toolbar-title>
          <p class="text-caption mb-0">
            Créez une bibliothèque de choix réutilisable sur plusieurs produits.
          </p>
        </div>
        <v-spacer></v-spacer>
        <v-btn color="primary" class="text-none" @click="openNewStep">
          <v-icon left>mdi-plus</v-icon>
          Nouvelle étape
        </v-btn>
      </v-toolbar>

      <v-progress-linear
        v-if="loadingPage || storeLoading"
        indeterminate
        color="primary"
      ></v-progress-linear>

      <v-row no-gutters>
        <v-col cols="12" md="3" class="step-list-column">
          <v-list v-if="dataSteps.length" two-line nav>
            <v-list-item-group
              :value="selectedStepId"
              color="primary"
              mandatory
              @change="selectStep"
            >
              <v-list-item
                v-for="step in dataSteps"
                :key="step.id"
                :value="step.id"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ step.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ (step.choices || []).length }} choix
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action v-if="!step.active">
                  <v-chip x-small color="grey" dark>Inactive</v-chip>
                </v-list-item-action>
              </v-list-item>
            </v-list-item-group>
          </v-list>
          <v-card-text v-else class="text-center grey--text">
            <v-icon large color="grey">mdi-format-list-numbered</v-icon>
            <p class="mt-2 mb-0">Aucune étape pour le moment.</p>
          </v-card-text>
        </v-col>

        <v-col cols="12" md="9" class="pa-4">
          <template v-if="selectedStep">
            <div class="d-flex flex-wrap align-center mb-4">
              <div>
                <h2 class="text-h6 mb-1">{{ selectedStep.name }}</h2>
                <p class="text-caption mb-0">
                  Modifiez l'étape et gérez l'ordre de ses choix.
                </p>
              </div>
              <v-spacer></v-spacer>
              <v-btn
                v-if="selectedStep.active"
                outlined
                color="error"
                class="text-none mr-2"
                @click="requestStepDeactivation()"
              >
                <v-icon left>mdi-eye-off-outline</v-icon>
                Désactiver
              </v-btn>
              <v-btn
                v-else
                outlined
                color="success"
                class="text-none mr-2"
                :loading="savingStep"
                @click="reactivateStep"
              >
                <v-icon left>mdi-eye-outline</v-icon>
                Réactiver
              </v-btn>
              <v-btn color="success" class="text-none" @click="openNewChoice">
                <v-icon left>mdi-plus</v-icon>
                Ajouter un choix
              </v-btn>
            </div>

            <v-card outlined class="pa-4 mb-6">
              <StepEditor
                :key="`step-${selectedStep.id}-${stepEditorKey}`"
                :value="selectedStep"
                :saving="savingStep"
                @save="saveSelectedStep"
              />
            </v-card>

            <div class="d-flex align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-0">Choix</h3>
              <v-chip small class="ml-2">{{ sortedChoices.length }}</v-chip>
            </div>

            <v-row v-if="sortedChoices.length">
              <v-col
                v-for="(choice, index) in sortedChoices"
                :key="choice.id"
                cols="12"
                sm="6"
                lg="4"
              >
                <v-card outlined height="100%" class="d-flex flex-column">
                  <v-img
                    :src="choiceImageSrc(choice)"
                    :aspect-ratio="1"
                    height="180"
                    class="grey lighten-3"
                  >
                    <div class="pa-2 d-flex flex-wrap choice-chips">
                      <v-chip
                        v-if="choice.choice_type === 'linked_product'"
                        x-small
                        color="primary"
                        dark
                      >
                        Produit lié
                      </v-chip>
                      <v-chip v-if="!choice.active" x-small color="grey" dark>
                        Inactif
                      </v-chip>
                      <v-chip
                        v-else-if="!choice.available"
                        x-small
                        color="warning"
                        dark
                      >
                        Indisponible
                      </v-chip>
                    </div>
                  </v-img>
                  <v-card-title class="text-subtitle-1 pb-1">
                    {{ choice.name || 'Choix sans nom' }}
                  </v-card-title>
                  <v-card-subtitle class="pb-2">
                    Position {{ index + 1 }}
                  </v-card-subtitle>
                  <v-spacer></v-spacer>
                  <v-divider></v-divider>
                  <v-card-actions>
                    <v-btn
                      icon
                      small
                      :disabled="index === 0 || reordering"
                      aria-label="Monter le choix"
                      @click="moveChoice(index, -1)"
                    >
                      <v-icon>mdi-arrow-up</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      small
                      :disabled="
                        index === sortedChoices.length - 1 || reordering
                      "
                      aria-label="Descendre le choix"
                      @click="moveChoice(index, 1)"
                    >
                      <v-icon>mdi-arrow-down</v-icon>
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn
                      text
                      small
                      class="text-none"
                      @click="editChoice(choice)"
                    >
                      Modifier
                    </v-btn>
                    <v-btn
                      v-if="choice.active"
                      icon
                      small
                      color="error"
                      aria-label="Désactiver le choix"
                      @click="requestChoiceDeactivation(choice)"
                    >
                      <v-icon>mdi-eye-off-outline</v-icon>
                    </v-btn>
                    <v-btn
                      v-else
                      icon
                      small
                      color="success"
                      aria-label="Réactiver le choix"
                      @click="reactivateChoice(choice)"
                    >
                      <v-icon>mdi-eye-outline</v-icon>
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
            <v-alert v-else text type="info">
              Cette étape ne contient encore aucun choix.
            </v-alert>
          </template>

          <v-card-text v-else class="text-center grey--text py-12">
            Sélectionnez une étape ou créez-en une nouvelle.
          </v-card-text>
        </v-col>
      </v-row>
    </v-card>

    <v-dialog v-model="newStepDialog" max-width="620" persistent>
      <v-card>
        <v-card-title>Nouvelle étape</v-card-title>
        <v-card-text>
          <StepEditor
            :key="`new-step-${newStepEditorKey}`"
            :saving="savingStep"
            show-cancel
            @save="createStep"
            @cancel="newStepDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="choiceDialog" max-width="720" persistent>
      <v-card>
        <v-card-title>
          {{ editingChoice ? 'Modifier le choix' : 'Nouveau choix' }}
        </v-card-title>
        <v-card-text>
          <ChoiceEditor
            :key="`choice-${choiceEditorKey}`"
            :value="editingChoice"
            :products="dataProducts"
            :default-position="sortedChoices.length"
            :saving="savingChoice"
            @save="saveChoice"
            @cancel="closeChoiceDialog"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="stepDeactivateDialog" max-width="560" persistent>
      <v-card>
        <v-card-title>Désactiver cette étape ?</v-card-title>
        <v-card-text>
          <p>
            L'étape restera dans la bibliothèque mais ne sera plus proposée à la
            commande.
          </p>
          <template v-if="selectedStepProducts.length">
            <p class="font-weight-bold mb-2">
              {{ selectedStepProducts.length }} produit(s) utilisent cette étape
              :
            </p>
            <v-chip
              v-for="product in selectedStepProducts"
              :key="product.id"
              small
              class="mr-2 mb-2"
            >
              {{ product.name }}
            </v-chip>
          </template>
          <v-alert v-else text dense type="info">
            Aucun produit ne référence actuellement cette étape.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="cancelStepDeactivation">
            Annuler
          </v-btn>
          <v-btn
            color="error"
            class="text-none"
            :loading="savingStep"
            @click="confirmStepDeactivation"
          >
            Désactiver
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="choiceDeactivateDialog" max-width="480" persistent>
      <v-card>
        <v-card-title>Désactiver ce choix ?</v-card-title>
        <v-card-text>
          {{ choiceToDeactivate && choiceToDeactivate.name }} ne sera plus
          proposé sur les produits utilisant cette étape.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="choiceDeactivateDialog = false">
            Annuler
          </v-btn>
          <v-btn
            color="error"
            class="text-none"
            :loading="savingChoice"
            @click="confirmChoiceDeactivation"
          >
            Désactiver
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import ChoiceEditor from '@/components/customizations/ChoiceEditor'
import StepEditor from '@/components/customizations/StepEditor'

export default {
  components: {
    ChoiceEditor,
    StepEditor,
  },
  middleware: 'auth',
  data() {
    return {
      loadingPage: false,
      savingStep: false,
      savingChoice: false,
      reordering: false,
      newStepDialog: false,
      choiceDialog: false,
      stepDeactivateDialog: false,
      choiceDeactivateDialog: false,
      editingChoice: null,
      choiceToDeactivate: null,
      pendingStepPayload: null,
      stepEditorKey: 0,
      newStepEditorKey: 0,
      choiceEditorKey: 0,
    }
  },
  computed: {
    dataSteps() {
      return this.$store.get('customizations/dataSteps') || []
    },
    storeLoading() {
      return this.$store.get('customizations/loading')
    },
    selectedStepId() {
      return this.$store.get('customizations/selectedStepId')
    },
    selectedStep() {
      return this.dataSteps.find(
        (step) => String(step.id) === String(this.selectedStepId)
      )
    },
    sortedChoices() {
      if (!this.selectedStep) return []
      return [...(this.selectedStep.choices || [])].sort(
        (left, right) =>
          Number(left.default_position) - Number(right.default_position) ||
          Number(left.id) - Number(right.id)
      )
    },
    dataProducts() {
      return this.$store.get('products/dataProduct') || []
    },
    selectedStepProducts() {
      if (!this.selectedStep) return []
      return this.dataProducts.filter((product) =>
        (product.customization_steps || []).some(
          (step) =>
            String(step.step_id || step.id) === String(this.selectedStep.id)
        )
      )
    },
    staticurl() {
      return String(this.$store.get('staticURL') || '').replace(/\/+$/, '')
    },
  },
  watch: {
    dataSteps: {
      immediate: true,
      handler(steps) {
        if (!steps.length) {
          this.selectStep(null)
          return
        }
        const selectionExists = steps.some(
          (step) => String(step.id) === String(this.selectedStepId)
        )
        if (!selectionExists) this.selectStep(steps[0].id)
      },
    },
  },
  async mounted() {
    if (parseInt(localStorage.getItem('access')) !== 0) {
      this.$router.replace('/menus')
      return
    }
    this.loadingPage = true
    await Promise.all([
      this.$store.dispatch('customizations/getSteps'),
      this.$store.dispatch('products/getProducts'),
    ])
    this.loadingPage = false
  },
  methods: {
    selectStep(stepId) {
      this.$store.set('customizations/selectedStepId', stepId)
    },
    openNewStep() {
      this.newStepEditorKey += 1
      this.newStepDialog = true
    },
    async createStep(payload) {
      const previousIds = new Set(this.dataSteps.map((step) => step.id))
      this.savingStep = true
      const saved = await this.$store.dispatch(
        'customizations/createStep',
        payload
      )
      this.savingStep = false
      if (!saved) return
      this.newStepDialog = false
      const created = this.dataSteps.find((step) => !previousIds.has(step.id))
      if (created) this.selectStep(created.id)
    },
    async saveSelectedStep(payload) {
      if (this.selectedStep.active && payload.active === false) {
        this.pendingStepPayload = payload
        this.stepDeactivateDialog = true
        return
      }
      await this.updateSelectedStep(payload)
    },
    async updateSelectedStep(payload) {
      this.savingStep = true
      await this.$store.dispatch('customizations/updateStep', {
        id: this.selectedStep.id,
        data: payload,
      })
      this.savingStep = false
    },
    requestStepDeactivation() {
      this.pendingStepPayload = null
      this.stepDeactivateDialog = true
    },
    cancelStepDeactivation() {
      this.stepDeactivateDialog = false
      this.pendingStepPayload = null
      this.stepEditorKey += 1
    },
    async confirmStepDeactivation() {
      this.savingStep = true
      const saved = this.pendingStepPayload
        ? await this.$store.dispatch('customizations/updateStep', {
            id: this.selectedStep.id,
            data: this.pendingStepPayload,
          })
        : await this.$store.dispatch(
            'customizations/deleteStep',
            this.selectedStep.id
          )
      this.savingStep = false
      if (saved) this.stepDeactivateDialog = false
      this.pendingStepPayload = null
      this.stepEditorKey += 1
    },
    reactivateStep() {
      return this.updateSelectedStep({
        name: this.selectedStep.name,
        description: this.selectedStep.description,
        active: true,
      })
    },
    openNewChoice() {
      this.editingChoice = null
      this.choiceEditorKey += 1
      this.choiceDialog = true
    },
    editChoice(choice) {
      this.editingChoice = choice
      this.choiceEditorKey += 1
      this.choiceDialog = true
    },
    closeChoiceDialog() {
      this.choiceDialog = false
      this.editingChoice = null
    },
    async saveChoice(data) {
      this.savingChoice = true
      const saved = this.editingChoice
        ? await this.$store.dispatch('customizations/updateChoice', {
            id: this.editingChoice.id,
            data,
          })
        : await this.$store.dispatch('customizations/createChoice', {
            stepId: this.selectedStep.id,
            data,
          })
      this.savingChoice = false
      if (saved) this.closeChoiceDialog()
    },
    requestChoiceDeactivation(choice) {
      this.choiceToDeactivate = choice
      this.choiceDeactivateDialog = true
    },
    async confirmChoiceDeactivation() {
      this.savingChoice = true
      const saved = await this.$store.dispatch(
        'customizations/deleteChoice',
        this.choiceToDeactivate.id
      )
      this.savingChoice = false
      if (saved) this.choiceDeactivateDialog = false
      this.choiceToDeactivate = null
    },
    reactivateChoice(choice) {
      return this.$store.dispatch('customizations/updateChoice', {
        id: choice.id,
        data: this.choiceUpdateData(choice, choice.default_position, true),
      })
    },
    choiceUpdateData(choice, position, active = choice.active) {
      const data = {
        choice_type: choice.choice_type,
        default_position: position,
        active,
      }
      if (choice.choice_type === 'linked_product') {
        data.linked_product_id = choice.linked_product_id
      } else {
        data.name = choice.name
      }
      return data
    },
    async moveChoice(index, direction) {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= this.sortedChoices.length) return
      const reordered = [...this.sortedChoices]
      const current = reordered[index]
      reordered[index] = reordered[targetIndex]
      reordered[targetIndex] = current
      const updates = reordered
        .map((choice, position) => ({ choice, position }))
        .filter(
          ({ choice, position }) => Number(choice.default_position) !== position
        )

      this.reordering = true
      let saved = true
      for (const update of updates) {
        const result = await this.$store.dispatch(
          'customizations/updateChoice',
          {
            id: update.choice.id,
            data: this.choiceUpdateData(update.choice, update.position),
            refresh: false,
            notify: false,
          }
        )
        if (!result) {
          saved = false
          break
        }
      }
      await this.$store.dispatch('customizations/getSteps')
      this.reordering = false
      if (saved) {
        this.$store.dispatch(
          'notifications/success',
          "L'ordre des choix a été enregistré."
        )
      }
    },
    choiceImageSrc(choice) {
      if (!choice.image) {
        return `${this.staticurl}/api/v1/imgproducts/default.png`
      }
      const directory =
        choice.choice_type === 'linked_product'
          ? 'imgproducts'
          : 'imgcustomizations'
      return `${this.staticurl}/api/v1/${directory}/${choice.image}`
    },
  },
}
</script>

<style scoped>
.step-list-column {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  min-height: 640px;
}

.choice-chips {
  gap: 6px;
}

@media (max-width: 959px) {
  .step-list-column {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    border-right: 0;
    min-height: auto;
  }
}
</style>
