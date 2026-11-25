<template>
  <v-container fluid>
    <v-card outlined class="mt-5">
      <v-card-title class="step-toolbar grey lighten-4 d-flex flex-wrap align-center">
        <div>
          <h1 class="text-h6">Étapes produits</h1>
          <p class="text-caption mb-0">
            Créez une bibliothèque de choix réutilisable sur plusieurs produits.
          </p>
        </div>
        <v-spacer></v-spacer>
        <div class="step-toolbar d-flex flex-wrap">
          <v-btn color="primary" class="text-none" @click="openNewStep">
            <v-icon left>mdi-plus</v-icon>
            Nouvelle étape
          </v-btn>
          <v-btn
            outlined
            color="primary"
            class="text-none"
            :disabled="!selectedStep || loadingPage || storeLoading || savingStep"
            @click="openStepUpdate"
          >
            <v-icon left>mdi-pencil-outline</v-icon>
            Mettre à jour l’étape
          </v-btn>
        </div>
      </v-card-title>

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
                outlined
                color="primary"
                class="text-none mr-2 mb-2"
                :loading="duplicatingStep"
                @click="duplicateSelectedStep"
              >
                <v-icon left>mdi-content-copy</v-icon>
                Dupliquer l’étape
              </v-btn>
              <v-btn
                outlined
                color="primary"
                class="text-none mr-2 mb-2"
                :disabled="loadingPage"
                @click="openStepProducts"
              >
                <v-icon left>mdi-package-variant</v-icon>
                Produits de l’étape ({{ selectedStepProducts.length }})
              </v-btn>
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
              <v-btn
                outlined
                color="error"
                class="text-none mr-2"
                @click="requestStepDeletion()"
              >
                <v-icon left>mdi-delete-forever-outline</v-icon>
                Supprimer définitivement
              </v-btn>
              <v-btn color="success" class="text-none" @click="openNewChoice">
                <v-icon left>mdi-plus</v-icon>
                Ajouter un choix
              </v-btn>
            </div>

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
                    Position {{ index + 1 }} · Prix par défaut :
                    {{ choiceDefaultPrice(choice) }} €
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
                    <v-btn
                      icon
                      small
                      color="error"
                      aria-label="Supprimer définitivement le choix"
                      @click="requestChoicePermanentDeletion(choice)"
                    >
                      <v-icon>mdi-delete-forever-outline</v-icon>
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
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">Nouvelle étape</v-card-title>
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

    <v-dialog v-model="stepUpdateDialog" max-width="620" persistent scrollable>
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">Mettre à jour l’étape</v-card-title>
        <v-card-text>
          <StepEditor
            v-if="stepToUpdate"
            :value="stepToUpdate"
            :saving="savingStep"
            :show-active="false"
            show-cancel
            @save="saveStepUpdate"
            @cancel="closeStepUpdate"
          >
            <template v-if="stepToUpdate.choices.length">
              <h3 class="text-subtitle-1 font-weight-bold">
                Ordre et tarifs des choix
              </h3>
              <p class="text-body-2">
                L’ordre affiché et les tarifs modifiés s’appliqueront à tous
                les produits qui utilisent cette étape.
              </p>
              <div
                v-for="(choice, index) in stepUpdateChoices"
                :key="choice.id"
                class="d-flex align-start"
              >
                <v-text-field
                  v-model="stepChoicePrices[choice.id]"
                  :label="`${index + 1}. ${choice.name || 'Choix sans nom'}`"
                  :rules="[validateStepChoicePrice]"
                  :disabled="savingStep"
                  type="number"
                  step="0.01"
                  suffix="€"
                ></v-text-field>
                <v-btn
                  icon
                  class="mt-2 ml-2"
                  :disabled="savingStep || index === 0"
                  :aria-label="`Monter ${choice.name || 'le choix'}`"
                  @click="moveStepUpdateChoice(index, -1)"
                >
                  <v-icon>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn
                  icon
                  class="mt-2"
                  :disabled="
                    savingStep || index === stepUpdateChoices.length - 1
                  "
                  :aria-label="`Descendre ${choice.name || 'le choix'}`"
                  @click="moveStepUpdateChoice(index, 1)"
                >
                  <v-icon>mdi-arrow-down</v-icon>
                </v-btn>
              </div>
            </template>
          </StepEditor>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="stepProductsDialog" max-width="700" scrollable persistent>
      <v-card v-if="productsStep" class="se-modal">
        <v-card-title class="se-modal-title">
          Produits de l’étape « {{ productsStep.name }} »
        </v-card-title>
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold">
            Avec cette étape ({{ productsWithStep.length }})
          </h3>
          <v-list
            v-if="productsWithStep.length"
            dense
            class="step-product-list mb-4"
          >
            <v-list-item v-for="product in productsWithStep" :key="product.id">
              <v-list-item-content>
                <v-list-item-title>{{ product.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="isArchivedProduct(product)">
                  Archivé
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <p v-else class="text-body-2 mb-4">Aucun produit rattaché.</p>
          <h3 class="text-subtitle-1 font-weight-bold">
            Sans cette étape ({{ productsWithoutStep.length }})
          </h3>
          <v-autocomplete
            v-model="productIdsToAttach"
            :items="productsWithoutStep"
            item-text="label"
            item-value="id"
            item-disabled="disabled"
            :disabled="attachingProducts"
            label="Rechercher et sélectionner des produits"
            no-data-text="Aucun produit trouvé"
            multiple
            chips
            deletable-chips
            clearable
          ></v-autocomplete>
          <v-alert v-if="!productsStep.active" dense text type="info">
            Activez cette étape pour l’ajouter à des produits.
          </v-alert>
          <v-alert v-if="attachProductsError" dense text type="error">
            {{ attachProductsError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer></v-spacer>
          <v-btn
            class="se-modal-action se-modal-action--secondary text-none"
            :disabled="attachingProducts"
            @click="stepProductsDialog = false"
          >
            Fermer
          </v-btn>
          <v-btn
            color="primary"
            class="se-modal-action se-modal-action--primary text-none"
            :disabled="!productsStep.active || !productIdsToAttach.length"
            :loading="attachingProducts"
            @click="attachStepToProducts"
          >
            Ajouter aux produits sélectionnés
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="choiceDialog" max-width="720" persistent>
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">
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
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">Désactiver cette étape ?</v-card-title>
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
        <v-card-actions class="se-modal-actions">
          <v-spacer></v-spacer>
          <v-btn class="se-modal-action se-modal-action--secondary text-none" @click="cancelStepDeactivation">
            <v-icon left>mdi-close</v-icon>
            Annuler
          </v-btn>
          <v-btn
            color="warning"
            class="se-modal-action se-modal-action--warning text-none"
            :loading="savingStep"
            @click="confirmStepDeactivation"
          >
            <v-icon left>mdi-eye-off</v-icon>
            Désactiver
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="stepDeleteDialog" max-width="560" persistent>
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">Supprimer définitivement cette étape ?</v-card-title>
        <v-card-text>
          <p v-if="stepToDelete">
            L’étape « {{ stepToDelete.name }} », ses choix et leurs images
            seront supprimés définitivement.
          </p>
          <template v-if="stepToDeleteProducts.length">
            <p class="font-weight-bold mb-2">
              Elle sera aussi retirée de
              {{ stepToDeleteProducts.length }} produit(s) :
            </p>
            <v-chip
              v-for="product in stepToDeleteProducts"
              :key="product.id"
              small
              class="mr-2 mb-2"
            >
              {{ product.name }}
            </v-chip>
          </template>
          <v-alert text dense type="warning" class="mt-3 mb-0">
            Cette action est irréversible. Les commandes historiques resteront
            inchangées.
          </v-alert>
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer></v-spacer>
          <v-btn
            class="se-modal-action se-modal-action--secondary text-none"
            :disabled="savingStep"
            @click="cancelStepDeletion"
          >
            <v-icon left>mdi-close</v-icon>
            Annuler
          </v-btn>
          <v-btn
            color="error"
            class="se-modal-action se-modal-action--danger text-none"
            :loading="savingStep"
            @click="confirmStepDeletion"
          >
            <v-icon left>mdi-delete</v-icon>
            Supprimer définitivement
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="choiceDeactivateDialog" max-width="480" persistent>
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">Désactiver ce choix ?</v-card-title>
        <v-card-text>
          {{ choiceToDeactivate && choiceToDeactivate.name }} ne sera plus
          proposé sur les produits utilisant cette étape.
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer></v-spacer>
          <v-btn class="se-modal-action se-modal-action--secondary text-none" @click="cancelChoiceDeactivation">
            <v-icon left>mdi-close</v-icon>
            Annuler
          </v-btn>
          <v-btn
            color="warning"
            class="se-modal-action se-modal-action--warning text-none"
            :loading="savingChoice"
            @click="confirmChoiceDeactivation"
          >
            <v-icon left>mdi-eye-off</v-icon>
            Désactiver
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="choiceDeleteDialog" max-width="560" persistent>
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">Supprimer définitivement ce choix ?</v-card-title>
        <v-card-text>
          <p v-if="choiceToDelete">
            Le choix « {{ choiceToDelete.name }} » sera supprimé définitivement
            de cette étape.
          </p>
          <template v-if="choiceToDeleteProducts.length">
            <p class="font-weight-bold mb-2">
              Il sera aussi retiré de
              {{ choiceToDeleteProducts.length }} produit(s) :
            </p>
            <v-chip
              v-for="product in choiceToDeleteProducts"
              :key="product.id"
              small
              class="mr-2 mb-2"
            >
              {{ product.name }}
            </v-chip>
          </template>
          <v-alert v-else text dense type="info">
            Aucun produit ne référence actuellement ce choix.
          </v-alert>
          <v-alert text dense type="warning" class="mt-3 mb-0">
            Cette action est irréversible. Les commandes historiques resteront
            inchangées.
          </v-alert>
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer></v-spacer>
          <v-btn
            class="se-modal-action se-modal-action--secondary text-none"
            :disabled="savingChoice"
            @click="cancelChoicePermanentDeletion"
          >
            <v-icon left>mdi-close</v-icon>
            Annuler
          </v-btn>
          <v-btn
            color="error"
            class="se-modal-action se-modal-action--danger text-none"
            :loading="savingChoice"
            @click="confirmChoicePermanentDeletion"
          >
            <v-icon left>mdi-delete</v-icon>
            Supprimer définitivement
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import ChoiceEditor from '@/components/customizations/ChoiceEditor'
import StepEditor from '@/components/customizations/StepEditor'

const reorderChoices = (choices, index, direction) => {
  const target = index + direction
  if (
    index < 0 ||
    index >= choices.length ||
    target < 0 ||
    target >= choices.length
  ) {
    return null
  }
  const reordered = [...choices]
  const [choice] = reordered.splice(index, 1)
  reordered.splice(target, 0, choice)
  return reordered
}

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
      stepUpdateDialog: false,
      stepProductsDialog: false,
      productsStepId: null,
      productIdsToAttach: [],
      attachingProducts: false,
      attachProductsError: '',
      duplicatingStep: false,
      choiceDialog: false,
      stepDeactivateDialog: false,
      stepDeleteDialog: false,
      choiceDeactivateDialog: false,
      choiceDeleteDialog: false,
      editingChoice: null,
      choiceToDeactivate: null,
      choiceToDelete: null,
      pendingStepPayload: null,
      stepToUpdate: null,
      stepChoicePrices: {},
      stepUpdateChoices: [],
      stepToDeactivateId: null,
      stepToDeleteId: null,
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
      return this.productsUsingStep(this.selectedStep)
    },
    productsStep() {
      return this.dataSteps.find(
        (step) => String(step.id) === String(this.productsStepId)
      )
    },
    productsWithStep() {
      return this.productsStep ? this.productsUsingStep(this.productsStep) : []
    },
    productsWithoutStep() {
      if (!this.productsStep) return []
      const attached = new Set(this.productsWithStep.map(({ id }) => String(id)))
      const linked = new Set(
        (this.productsStep.choices || [])
          .filter((choice) => choice.linked_product_id != null)
          .map((choice) => String(choice.linked_product_id))
      )
      return this.dataProducts
        .filter(({ id }) => !attached.has(String(id)))
        .map((product) => {
          let reason = ''
          if (this.isArchivedProduct(product)) reason = 'archivé'
          else if (linked.has(String(product.id))) reason = 'déjà utilisé comme choix'
          return {
            id: product.id,
            label: reason ? `${product.name} (${reason})` : product.name,
            disabled: Boolean(reason),
          }
        })
    },
    stepToDelete() {
      return this.dataSteps.find(
        (step) => String(step.id) === String(this.stepToDeleteId)
      )
    },
    stepToDeleteProducts() {
      if (!this.stepToDelete) return []
      return this.productsUsingStep(this.stepToDelete)
    },
    choiceToDeleteProducts() {
      if (!this.choiceToDelete) return []
      return this.productsUsingChoice(this.choiceToDelete)
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
    isArchivedProduct(product) {
      return [true, 1, '1'].includes(product.archived)
    },
    productsUsingStep(step) {
      return this.dataProducts.filter((product) =>
        (product.customization_steps || []).some(
          (productStep) =>
            String(productStep.step_id || productStep.id) === String(step.id)
        )
      )
    },
    productsUsingChoice(choice) {
      return this.dataProducts.filter((product) =>
        (product.customization_steps || []).some((productStep) =>
          (productStep.choices || []).some(
            (productChoice) =>
              String(
                productChoice.step_choice_id ||
                  productChoice.id ||
                  productChoice.product_step_choice_id
              ) === String(choice.id)
          )
        )
      )
    },
    selectStep(stepId) {
      this.$store.set('customizations/selectedStepId', stepId)
    },
    async duplicateSelectedStep() {
      if (!this.selectedStep || this.duplicatingStep) return
      this.duplicatingStep = true
      try {
        const id = await this.$store.dispatch(
          'customizations/duplicateStep',
          this.selectedStep.id
        )
        if (id) this.selectStep(id)
      } finally {
        this.duplicatingStep = false
      }
    },
    openStepProducts() {
      this.productsStepId = this.selectedStep.id
      this.productIdsToAttach = []
      this.attachProductsError = ''
      this.stepProductsDialog = true
    },
    async attachStepToProducts() {
      if (
        !this.productsStep?.active ||
        !this.productIdsToAttach.length ||
        this.attachingProducts
      ) {
        return
      }
      this.attachingProducts = true
      this.attachProductsError = ''
      try {
        const saved = await this.$store.dispatch(
          'customizations/attachStepToProducts',
          { id: this.productsStep.id, productIds: [...this.productIdsToAttach] }
        )
        if (saved) this.productIdsToAttach = []
        else this.attachProductsError = this.$store.get('customizations/message')
      } finally {
        this.attachingProducts = false
      }
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
    openStepUpdate() {
      if (!this.selectedStep) return
      this.stepToUpdate = { ...this.selectedStep, choices: this.sortedChoices }
      this.stepUpdateChoices = this.sortedChoices
      this.stepChoicePrices = {}
      for (const choice of this.stepToUpdate.choices) {
        this.stepChoicePrices[choice.id] = this.choiceDefaultPrice(choice)
      }
      this.stepUpdateDialog = true
    },
    closeStepUpdate() {
      this.stepUpdateDialog = false
      this.stepToUpdate = null
      this.stepChoicePrices = {}
      this.stepUpdateChoices = []
    },
    moveStepUpdateChoice(index, direction) {
      const reordered = reorderChoices(this.stepUpdateChoices, index, direction)
      if (reordered) this.stepUpdateChoices = reordered
    },
    validateStepChoicePrice(value) {
      return (
        (/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value) &&
          Math.abs(Number(value)) <= 99999999.99) ||
        'Saisissez un prix valide avec deux décimales au maximum.'
      )
    },
    async saveStepUpdate(payload) {
      if (!this.stepToUpdate || this.savingStep) return
      const step = this.stepToUpdate
      const choicePrices = step.choices
        .filter(
          (choice) =>
            Number(this.stepChoicePrices[choice.id]) !==
            Number(this.choiceDefaultPrice(choice))
        )
        .map((choice) => ({
          choice_id: choice.id,
          default_extra_price: this.stepChoicePrices[choice.id],
        }))
      this.savingStep = true
      try {
        const saved = await this.$store.dispatch('customizations/updateStep', {
          id: step.id,
          data: {
            ...payload,
            choice_prices: choicePrices,
            choice_order: this.stepUpdateChoices.map(({ id }) => id),
          },
        })
        if (saved) this.closeStepUpdate()
      } finally {
        this.savingStep = false
      }
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
      if (!this.selectedStep) return
      this.pendingStepPayload = {
        name: this.selectedStep.name,
        description: this.selectedStep.description,
        active: false,
      }
      this.stepToDeactivateId = this.selectedStep.id
      this.stepDeactivateDialog = true
    },
    cancelStepDeactivation() {
      this.stepDeactivateDialog = false
      this.pendingStepPayload = null
      this.stepToDeactivateId = null
    },
    async confirmStepDeactivation() {
      if (!this.stepToDeactivateId || this.savingStep) return
      const stepId = this.stepToDeactivateId
      const pendingPayload = this.pendingStepPayload
      if (!pendingPayload) return
      this.savingStep = true
      let saved = false
      try {
        saved = await this.$store.dispatch('customizations/updateStep', {
          id: stepId,
          data: pendingPayload,
        })
      } finally {
        this.savingStep = false
      }
      if (!saved) return
      this.stepDeactivateDialog = false
      this.pendingStepPayload = null
      this.stepToDeactivateId = null
    },
    reactivateStep() {
      return this.updateSelectedStep({
        name: this.selectedStep.name,
        description: this.selectedStep.description,
        active: true,
      })
    },
    requestStepDeletion() {
      if (!this.selectedStep) return
      this.stepToDeleteId = this.selectedStep.id
      this.stepDeleteDialog = true
    },
    cancelStepDeletion() {
      if (this.savingStep) return
      this.stepDeleteDialog = false
      this.stepToDeleteId = null
    },
    async confirmStepDeletion() {
      if (!this.stepToDeleteId || this.savingStep) return
      const stepId = this.stepToDeleteId
      this.savingStep = true
      let deleted = false
      try {
        deleted = await this.$store.dispatch(
          'customizations/deleteStep',
          stepId
        )
      } finally {
        this.savingStep = false
      }
      if (!deleted) return
      this.stepDeleteDialog = false
      this.stepToDeleteId = null
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
      if (!choice) return
      this.choiceToDeactivate = choice
      this.choiceDeactivateDialog = true
    },
    cancelChoiceDeactivation() {
      this.choiceDeactivateDialog = false
      this.choiceToDeactivate = null
    },
    async confirmChoiceDeactivation() {
      if (!this.choiceToDeactivate || this.savingChoice) return
      const choiceId = this.choiceToDeactivate.id
      this.savingChoice = true
      let saved = false
      try {
        saved = await this.$store.dispatch(
          'customizations/deleteChoice',
          choiceId
        )
      } finally {
        this.savingChoice = false
      }
      if (!saved) return
      this.choiceDeactivateDialog = false
      this.choiceToDeactivate = null
    },
    requestChoicePermanentDeletion(choice) {
      if (!choice) return
      this.choiceToDelete = choice
      this.choiceDeleteDialog = true
    },
    cancelChoicePermanentDeletion() {
      if (this.savingChoice) return
      this.choiceDeleteDialog = false
      this.choiceToDelete = null
    },
    async confirmChoicePermanentDeletion() {
      if (!this.choiceToDelete || this.savingChoice) return
      const choiceId = this.choiceToDelete.id
      this.savingChoice = true
      let deleted = false
      try {
        deleted = await this.$store.dispatch(
          'customizations/deleteChoicePermanently',
          choiceId
        )
      } finally {
        this.savingChoice = false
      }
      if (!deleted) return
      this.choiceDeleteDialog = false
      this.choiceToDelete = null
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
        default_extra_price:
          choice.default_extra_price == null ? '0.00' : choice.default_extra_price,
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
      if (!this.selectedStep || this.reordering) return
      const reordered = reorderChoices(this.sortedChoices, index, direction)
      if (!reordered) return
      this.reordering = true
      try {
        const saved = await this.$store.dispatch('customizations/updateStep', {
          id: this.selectedStep.id,
          data: { choice_order: reordered.map(({ id }) => id) },
          notify: false,
        })
        if (saved) {
          this.$store.dispatch(
            'notifications/success',
            "L’ordre des choix a été enregistré."
          )
        }
      } finally {
        this.reordering = false
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
    choiceDefaultPrice(choice) {
      return choice && choice.default_extra_price != null
        ? choice.default_extra_price
        : '0.00'
    },
  },
}
</script>

<style scoped>
.step-product-list {
  max-height: 220px;
  overflow-y: auto;
}

.step-toolbar {
  gap: 8px;
}

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
