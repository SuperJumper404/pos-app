<template>
  <v-card
    outlined
    height="100%"
    class="choice-card d-flex flex-column"
    :class="{
      'choice-card--selected': selected,
      'choice-card--disabled': disabled,
    }"
    :aria-pressed="String(selected)"
    :aria-disabled="String(disabled)"
    role="button"
    :tabindex="disabled ? -1 : 0"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <v-img
      :src="imageSrc"
      :aspect-ratio="1"
      class="choice-card__image grey lighten-3"
    >
      <div class="pa-2 d-flex justify-space-between align-start">
        <v-chip v-if="selected" small color="primary" dark>
          <v-icon left small>mdi-check-circle</v-icon>
          Sélectionné
        </v-chip>
        <span v-else></span>
        <v-chip v-if="disabled" small color="grey darken-2" dark>
          Indisponible
        </v-chip>
      </div>
    </v-img>

    <v-card-text class="choice-card__content text-center">
      <div class="font-weight-bold text-body-1 choice-card__name">
        {{ choiceName }}
      </div>
      <div
        class="mt-2 font-weight-medium"
        :class="supplementPrice === 0 ? 'success--text' : 'primary--text'"
      >
        {{ priceLabel }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { formatPrice, parsePrice } from '@/helpers/price'

const isActive = (value) => ![false, 0, '0', 'false'].includes(value)

export default {
  name: 'CustomizationChoiceCard',
  props: {
    choice: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    choiceId() {
      return Number(this.choice.product_step_choice_id)
    },
    choiceName() {
      return this.choice.choice_name || this.choice.name || 'Choix'
    },
    isLinkedProduct() {
      return this.choice.choice_type === 'linked_product'
    },
    disabled() {
      if (!isActive(this.choice.active)) return true
      return this.isLinkedProduct && this.choice.available === false
    },
    supplementPrice() {
      return parsePrice(this.choice.extra_price)
    },
    priceLabel() {
      return this.supplementPrice === 0
        ? 'Inclus'
        : `+${formatPrice(this.supplementPrice)} €`
    },
    staticurl() {
      const baseUrl = this.$store ? this.$store.get('staticURL') : ''
      return String(baseUrl || '').replace(/\/+$/, '')
    },
    imageSrc() {
      const image = this.choice.image
      if (image && /^(?:https?:|data:|\/)/.test(image)) return image
      if (!image) return `${this.staticurl}/api/v1/imgproducts/default.png`
      const directory = this.isLinkedProduct
        ? 'imgproducts'
        : 'imgcustomizations'
      return `${this.staticurl}/api/v1/${directory}/${image}`
    },
  },
  methods: {
    toggle() {
      if (this.disabled || !Number.isInteger(this.choiceId)) return
      this.$emit('toggle', this.choiceId)
    },
  },
}
</script>

<style scoped>
.choice-card {
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    transform 0.15s ease;
}

.choice-card:hover,
.choice-card:focus {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  outline: none;
  transform: translateY(-1px);
}

.choice-card--selected {
  border-color: var(--v-primary-base) !important;
  border-width: 2px;
}

.choice-card--disabled {
  cursor: not-allowed;
  filter: grayscale(0.55);
  opacity: 0.72;
}

.choice-card--disabled:hover {
  box-shadow: none;
  transform: none;
}

.choice-card__content {
  flex: 1 1 auto;
}

.choice-card__name {
  min-height: 3rem;
  overflow-wrap: anywhere;
}
</style>
