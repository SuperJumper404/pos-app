<template>
  <v-form ref="form" v-model="valid" @submit.prevent="submit">
    <v-text-field
      v-model="form.name"
      label="Nom de l'étape"
      :rules="[
        (value) => !!String(value || '').trim() || 'Le nom est requis',
        (value) =>
          String(value || '').trim().length <= 255 ||
          'La longueur maximale est de 255 caractères.',
      ]"
      counter="255"
      maxlength="255"
      required
    ></v-text-field>
    <v-textarea
      v-model="form.description"
      label="Description"
      :rules="[
        (value) =>
          String(value || '').length <= 512 ||
          'La longueur maximale est de 512 caractères.',
      ]"
      rows="2"
      counter="512"
      maxlength="512"
      auto-grow
    ></v-textarea>
    <v-switch
      v-model="form.active"
      label="Étape active"
      color="success"
      inset
    ></v-switch>
    <div class="d-flex justify-end">
      <v-btn
        v-if="showCancel"
        text
        class="text-none mr-2"
        @click="$emit('cancel')"
      >
        Annuler
      </v-btn>
      <v-btn
        color="primary"
        class="text-none"
        type="submit"
        :loading="saving"
        :disabled="!valid"
      >
        Enregistrer
        <v-icon small right>mdi-content-save</v-icon>
      </v-btn>
    </div>
  </v-form>
</template>

<script>
export default {
  name: 'StepEditor',
  props: {
    value: {
      type: Object,
      default: null,
    },
    saving: {
      type: Boolean,
      default: false,
    },
    showCancel: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      valid: false,
      form: {
        name: '',
        description: '',
        active: true,
      },
    }
  },
  watch: {
    value: {
      immediate: true,
      deep: true,
      handler(value) {
        this.form = {
          name: (value && value.name) || '',
          description: (value && value.description) || '',
          active: value ? value.active !== false : true,
        }
      },
    },
  },
  methods: {
    submit() {
      if (!this.$refs.form.validate()) return
      this.$emit('save', {
        name: this.form.name.trim(),
        description: this.form.description
          ? this.form.description.trim()
          : null,
        active: this.form.active,
      })
    },
  },
}
</script>
