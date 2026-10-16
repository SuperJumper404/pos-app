<template>
  <v-sheet outlined rounded class="image-library">
    <div class="image-library__toolbar">
      <v-text-field
        v-model="search"
        class="se-search-field"
        dense
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        label="Nom du fichier"
        placeholder="Rechercher par nom"
      />
      <v-btn
        icon
        :loading="loading"
        :disabled="loading"
        title="Rafraichir"
        aria-label="Rafraichir"
        @click="loadImages()"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <v-alert v-if="error" dense text type="error" class="mt-3 mb-0">
      {{ error }}
    </v-alert>

    <div v-else-if="loading && images.length === 0" class="image-library__state">
      <v-progress-circular indeterminate color="primary" />
      <span>Chargement des images</span>
    </div>

    <div v-else-if="filteredImages.length === 0" class="image-library__state">
      <v-icon color="grey">mdi-image-search-outline</v-icon>
      <span>Aucune image trouvee</span>
    </div>

    <div v-else class="image-library__grid">
      <button
        v-for="image in filteredImages"
        :key="image.id"
        type="button"
        class="image-library__item"
        :class="{ 'image-library__item--selected': selectedPath === image.path }"
        :aria-pressed="selectedPath === image.path"
        @click="selectImage(image)"
      >
        <v-img
          :src="image.previewUrl"
          :alt="image.title"
          aspect-ratio="1"
          class="image-library__thumb"
        >
          <template #placeholder>
            <div class="image-library__thumb-placeholder">
              <v-progress-circular indeterminate size="22" width="2" />
            </div>
          </template>
        </v-img>
        <span class="image-library__title text-caption">{{ image.title }}</span>
      </button>
    </div>
    <div v-if="hasMore && !error" class="d-flex justify-center mt-4">
      <v-btn
        outlined
        color="primary"
        class="text-none"
        :loading="loading"
        :disabled="loading"
        @click="loadImages({ append: true })"
      >
        <v-icon left>mdi-chevron-down</v-icon>
        Charger plus
      </v-btn>
    </div>
  </v-sheet>
</template>

<script>
import {
  buildSupabaseObjectUrl,
  buildSupabasePublicUrl,
  filterImageLibraryItems,
  imageLibraryConfig,
} from '@/helpers/productImageLibrary'

export default {
  name: 'ProductImageLibraryPicker',
  data() {
    return {
      config: null,
      error: '',
      images: [],
      hasMore: false,
      loading: false,
      offset: 0,
      requestId: 0,
      search: '',
      searchTimer: null,
      selectedPath: '',
    }
  },
  computed: {
    filteredImages() {
      return filterImageLibraryItems(this.images, '').map((image) => ({
        ...image,
        previewUrl: buildSupabasePublicUrl({
          url: this.config.url,
          bucket: this.config.bucket,
          path: image.path,
        }),
      }))
    },
  },
  watch: {
    search() {
      if (!this.config) return
      clearTimeout(this.searchTimer)
      this.requestId += 1
      this.images = []
      this.hasMore = false
      this.offset = 0
      this.error = ''
      this.loading = true
      this.searchTimer = setTimeout(() => this.loadImages(), 300)
    },
  },
  mounted() {
    try {
      this.config = imageLibraryConfig({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
        SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
      })
      this.loadImages()
    } catch (error) {
      this.error = error.message
    }
  },
  beforeDestroy() {
    clearTimeout(this.searchTimer)
    this.requestId += 1
  },
  methods: {
    requestHeaders() {
      return {
        apikey: this.config.anonKey,
        Authorization: `Bearer ${this.config.anonKey}`,
      }
    },
    async loadImages({ append = false } = {}) {
      if (!this.config || (append && (!this.hasMore || this.loading))) return
      clearTimeout(this.searchTimer)
      const requestId = ++this.requestId
      if (!append) {
        this.images = []
        this.offset = 0
        this.hasMore = false
      }
      this.loading = true
      this.error = ''

      try {
        const response = await fetch(
          `${this.config.url}/storage/v1/object/list/${encodeURIComponent(
            this.config.bucket
          )}`,
          {
            method: 'POST',
            headers: {
              ...this.requestHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prefix: '',
              search: String(this.search || '').trim(),
              limit: 200,
              offset: this.offset,
              sortBy: { column: 'name', order: 'asc' },
            }),
          }
        )

        if (!response.ok) {
          throw new Error('Impossible de charger la bibliotheque.')
        }

        const images = await response.json()
        if (requestId !== this.requestId) return
        this.images = append ? [...this.images, ...images] : images
        this.offset += images.length
        this.hasMore = images.length === 200
      } catch (error) {
        if (requestId !== this.requestId) return
        this.error = error.message || 'Impossible de charger la bibliotheque.'
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    async selectImage(image) {
      if (!this.config || !image) return
      this.selectedPath = image.path
      this.error = ''

      try {
        const response = await fetch(
          buildSupabaseObjectUrl({
            url: this.config.url,
            bucket: this.config.bucket,
            path: image.path,
          }),
          { headers: this.requestHeaders() }
        )

        if (!response.ok) {
          throw new Error("Impossible de recuperer l'image.")
        }

        const blob = await response.blob()
        const file = new File([blob], image.name, {
          type: blob.type || image.contentType || 'image/png',
        })
        this.$emit('select', file)
      } catch (error) {
        this.error = error.message || "Impossible de recuperer l'image."
      }
    },
  },
}
</script>

<style scoped>
.image-library {
  padding: 16px;
  background: #fff;
}

.image-library__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 8px;
  align-items: center;
}

.image-library__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 12px;
  margin-top: 16px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.image-library__item {
  display: block;
  width: 100%;
  padding: 6px;
  border: thin solid;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.image-library__item:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.28);
  outline-offset: 2px;
}

.image-library__item:hover,
.image-library__item--selected {
  border-color: var(--v-primary-base);
  box-shadow: 0 8px 20px rgba(25, 118, 210, 0.16);
}

.image-library__thumb {
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
}

.image-library__thumb-placeholder,
.image-library__state {
  min-height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.image-library__state {
  flex-direction: column;
  margin-top: 16px;
  border: thin dashed;
  border-radius: 8px;
}

.image-library__title {
  display: block;
  margin-top: 6px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
</style>
