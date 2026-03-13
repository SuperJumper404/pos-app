<template>
  <v-card outlined>
    <v-file-input
      id="imageCropperInput"
      v-model="rawInput"
      type="file"
      accept="image/*"
      multiple
      class="d-none"
      @change="onPick"
    />
    <div
      v-if="!src && !previewUrlLocal"
      class="d-flex justify-center flex-column align-center"
    >
      <v-hover v-slot="{ hover }">
        <div class="placeholder">
          <v-icon
            size="140"
            onclick="document.getElementById('imageCropperInput').click()"
            :class="['placeholder-icon', { 'placeholder-icon--hover': hover }]"
          >
            mdi-image-plus-outline
          </v-icon>
        </div>
      </v-hover>
      <v-btn
        :loading="loadingBtnImg"
        color="success"
        onclick="document.getElementById('imageCropperInput').click()"
        class="text-none mt-5 mb-5"
      >
        <v-icon class="mr-1">mdi-cloud-upload</v-icon> Importer une image
      </v-btn>
    </div>
    <client-only>
      <div v-if="src && !previewUrl" class="stage">
        <Cropper
          ref="cropper"
          class="cropper"
          :src="src"
          :stencil-props="{ aspectRatio: ratioLocal }"
          :canvas="{ width: 1600, height: 1280 }"
        />
      </div>
    </client-only>
    <div v-if="previewUrl">
      <v-img :src="previewUrl" />
    </div>
    <div v-if="previewUrlLocal">
      <v-img :src="previewUrlLocal" />
    </div>
    <div v-if="src || previewUrlLocal" class="d-flex justify-center">
      <v-btn
        v-if="!previewUrl && previewUrlLocal === null"
        class="text-none ml-2 mr-2 mt-4 mb-4"
        color="primary"
        @click="crop"
        >Valider</v-btn
      >
      <v-btn
        v-if="!previewUrl || previewUrlLocal === null"
        class="text-none ml-2 mr-2 mt-4 mb-4"
        color="warning"
        @click="reset"
        >Changer</v-btn
      >
    </div>
  </v-card>
</template>

<script>
import { Cropper } from 'vue-advanced-cropper'

export default {
  name: 'ImageCropper',
  components: { Cropper },

  // Vue 2 v-model: prop = value, event = input
  props: {
    value: {
      type: [Blob, null],
      default: null,
    },
    previewUrlProp: {
      type: String,
      default: null,
    },
    ratio: {
      type: Number,
      default: 5 / 4,
    },
  },

  data() {
    return {
      src: null,
      inputUrl: null,
      rawInput: null,
      ratioLocal: null,
      previewUrl: null,
      previewObjUrl: null,
      previewUrlLocal: null,
    }
  },
  watch: {
    previewUrlProp: {
      immediate: true,
      handler(val) {
        this.previewUrlLocal = val
      },
    },
    ratio: {
      immediate: true,
      handler(val) {
        this.ratioLocal = val
      },
    },
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    cleanup() {
      if (this.inputUrl) URL.revokeObjectURL(this.inputUrl)
      if (this.previewObjUrl) URL.revokeObjectURL(this.previewObjUrl)
      this.inputUrl = null
      this.previewObjUrl = null
    },

    onPick() {
      // Nettoyage URLs précédentes
      this.cleanup()

      // v-file-input avec multiple => tableau; sans multiple => File direct
      const file = Array.isArray(this.rawInput)
        ? this.rawInput[0]
        : this.rawInput
      if (!file) return

      this.inputUrl = URL.createObjectURL(file)
      this.src = this.inputUrl

      // reset preview + valeur v-model (on n'a pas encore crop)
      this.previewUrl = null
      this.$emit('input', null)
    },

    crop() {
      const inst = this.$refs.cropper
      if (!inst) return

      const result = inst.getResult && inst.getResult()
      const canvas = result && result.canvas
      if (!canvas) return

      canvas.toBlob(
        (blob) => {
          if (!blob) return

          // Preview interne (optionnel, mais utile)
          if (this.previewObjUrl) URL.revokeObjectURL(this.previewObjUrl)
          this.previewObjUrl = URL.createObjectURL(blob)
          this.previewUrl = this.previewObjUrl

          // >>> v-model mis à jour ici <<<
          this.$emit('input', blob)
        },
        'image/webp',
        0.9
      )
    },

    reset() {
      this.cleanup()
      this.src = null
      this.rawInput = null
      this.previewUrl = null
      this.previewUrlLocal = null
      this.$emit('input', null)
    },
  },
}
</script>

<style scoped>
.stage {
  margin-top: 12px;
}
.cropper {
  width: 100%;
  height: 460px;
  background: #eee;
  border-radius: 12px;
  overflow: hidden;
}

.preview img {
  margin-top: 12px;
  width: 280px;
  border-radius: 12px;
}
.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  transition: transform 160ms ease, opacity 160ms ease;
  opacity: 0.85;
}

.placeholder-icon--hover {
  transform: scale(1.06);
  opacity: 1;
}
</style>
