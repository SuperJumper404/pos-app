<template>
  <v-container fluid class="tables-page pa-5">
    <div class="tables-action-bar">
      <v-btn
        color="primary"
        class="tables-add text-none"
        depressed
        @click="$router.push('/tables/newtable')"
      >
        <v-icon small left>mdi-plus</v-icon>
        Ajouter une table
      </v-btn>
    </div>

    <v-skeleton-loader
      v-if="loadPage"
      class="mt-5"
      type="list-item-avatar-three-line, list-item-avatar-three-line, list-item-avatar-three-line"
    />

    <v-card
      v-else-if="!dataTables.length"
      outlined
      class="tables-empty mt-5"
    >
      <v-icon color="primary" size="42">mdi-table-plus</v-icon>
      <h2>Aucune table</h2>
      <p>Ajoutez une table pour générer son accès QR et l'afficher en caisse.</p>
    </v-card>

    <transition-group v-else name="tables-list" tag="div" class="tables-grid mt-5">
      <v-card
        v-for="items in dataTables"
        :key="items.id"
        outlined
        class="tables-card"
      >
        <div class="tables-card__main">
          <div class="tables-card__handle">
            <v-btn
              icon
              small
              :disabled="isFirstTable(items) || orderLoading"
              @click="moveTable(tableIndex(items), -1)"
            >
              <v-icon small>mdi-arrow-up</v-icon>
            </v-btn>
            <v-btn
              icon
              small
              :disabled="isLastTable(items) || orderLoading"
              @click="moveTable(tableIndex(items), 1)"
            >
              <v-icon small>mdi-arrow-down</v-icon>
            </v-btn>
          </div>

          <div class="tables-card__content">
            <div class="tables-card__header">
              <div>
                <h2>{{ items.name }}</h2>
              </div>
            </div>

            <div class="tables-card__identity">
              <div class="tables-card__meta">
                <v-icon small>mdi-identifier</v-icon>
                <div>
                  <span>Identifiant</span>
                  <strong>{{ items.email }}</strong>
                </div>
              </div>
            </div>

            <div v-if="!items.table_access_token" class="tables-alert">
              <v-icon small>mdi-alert-circle-outline</v-icon>
              QR indisponible pour cette table.
            </div>

            <div v-else class="tables-url">
              <div>
                <span>URL QR table</span>
                <strong>{{ tableAccessUrl(items) }}</strong>
              </div>
              <v-btn
                icon
                small
                class="tables-copy"
                :class="{ 'tables-copy--done': copiedTableId === items.id }"
                @click="copyTableUrl(items)"
              >
                <v-icon small>
                  {{
                    copiedTableId === items.id
                      ? 'mdi-check'
                      : 'mdi-content-copy'
                  }}
                </v-icon>
              </v-btn>
            </div>
          </div>
        </div>

        <div class="tables-card__qr">
          <div
            v-if="items.table_access_token"
            :ref="`qr-${items.id}`"
            class="qr-code-download-wrapper tables-qr-preview"
          >
            <qr-code :text="tableAccessUrl(items)" />
          </div>
          <div v-else class="tables-qr-placeholder">
            <v-icon>mdi-qrcode-remove</v-icon>
          </div>
        </div>

        <v-card-actions class="tables-card__actions">
          <v-btn
            outlined
            color="error"
            class="tables-action text-none"
            @click="$router.push(`/tables/delete/${items.id}?modals=true`)"
          >
            <v-icon small left>mdi-trash-can</v-icon>
            Supprimer
          </v-btn>

          <v-btn
            color="primary"
            dark
            depressed
            class="tables-action text-none"
            :disabled="!items.table_access_token"
            @click="downloadQrCode(items.id)"
          >
            <v-icon small left>mdi-download</v-icon>
            Télécharger
          </v-btn>
        </v-card-actions>
      </v-card>
    </transition-group>
  </v-container>
</template>

<script>
import formatdate from '@/helpers/formatdate'
import { buildTableAccessUrl } from '@/helpers/tableIdentity'
import Vue from 'vue'
import VueQRCodeComponent from 'vue-qrcode-component/src/QRCode.vue'

// eslint-disable-next-line vue/component-definition-name-casing
Vue.component('qr-code', VueQRCodeComponent)
export default {
  mixins: [formatdate],
  middleware: 'auth',
  data() {
    return {
      copiedTableId: null,
      copyResetTimer: null,
      loadPage: false,
      orderLoading: false,
    }
  },
  head() {
    return {
      title: `${
        this.$route.name.charAt(0).toUpperCase() + this.$route.name.slice(1)
      }`,
    }
  },
  computed: {
    dataTables() {
      return this.$store.get('tables/dataTables') || []
    },
    websiteUrl() {
      return window.location.origin
    },
  },
  beforeDestroy() {
    if (this.copyResetTimer) {
      clearTimeout(this.copyResetTimer)
    }
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('tables/getAllTables').finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    tableAccessUrl(item) {
      return buildTableAccessUrl(this.websiteUrl, item.table_access_token)
    },
    searchData() {
      this.loadPage = true
      this.$store.dispatch('tables/getAllTables').finally(() => {
        this.loadPage = false
      })
    },
    tableIndex(item) {
      return this.dataTables.findIndex((table) => table.id === item.id)
    },
    isFirstTable(item) {
      return this.tableIndex(item) === 0
    },
    isLastTable(item) {
      return this.tableIndex(item) === this.dataTables.length - 1
    },
    async moveTable(index, direction) {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= this.dataTables.length) return

      const ordered = [...this.dataTables]
      const [moved] = ordered.splice(index, 1)
      ordered.splice(targetIndex, 0, moved)
      this.orderLoading = true
      await this.$store.dispatch(
        'tables/reorderTables',
        ordered.map((table) => table.id)
      )
      this.orderLoading = false
    },
    async copyTableUrl(item) {
      const url = this.tableAccessUrl(item)

      try {
        await navigator.clipboard.writeText(url)
      } catch (error) {
        const input = document.createElement('textarea')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }

      this.copiedTableId = item.id
      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer)
      }
      this.copyResetTimer = setTimeout(() => {
        this.copiedTableId = null
      }, 1400)
    },
    downloadQrCode(id) {
      let wrapper = this.$refs[`qr-${id}`]
      if (!wrapper) return
      if (Array.isArray(wrapper)) {
        wrapper = wrapper[0]
      }
      if (wrapper && wrapper.$el) {
        wrapper = wrapper.$el
      }
      if (!wrapper || typeof wrapper.querySelector !== 'function') return

      const svg = wrapper.querySelector('svg')
      if (svg) {
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svg)
        const blob = new Blob([svgString], {
          type: 'image/svg+xml;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `qr-${id}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        return
      }

      const canvas = wrapper.querySelector('canvas')
      if (canvas) {
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = `qr-${id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      const img = wrapper.querySelector('img')
      if (img && img.src) {
        const link = document.createElement('a')
        link.href = img.src
        link.download = `qr-${id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    },
  },
}
</script>

<style scoped>
.tables-page {
  background: #f7f9fc;
  min-height: calc(100vh - 64px);
}

.tables-action-bar,
.tables-card__main,
.tables-card__header,
.tables-card__meta,
.tables-url,
.tables-card__actions {
  align-items: center;
  display: flex;
}

.tables-action-bar {
  justify-content: flex-end;
}

.tables-add,
.tables-action {
  border-radius: var(--se-radius-sm) !important;
  min-height: 38px;
}

.tables-grid {
  display: grid;
  gap: var(--se-space-3);
  grid-template-columns: 1fr;
}

.tables-card {
  border-color: var(--se-color-border) !important;
  display: grid;
  gap: var(--se-space-4);
  grid-template-columns: minmax(0, 1fr) 272px auto;
  min-height: 288px;
  overflow: hidden;
  padding: 14px 16px;
}

.tables-card__main {
  align-items: stretch;
  min-width: 0;
}

.tables-card__handle {
  align-items: center;
  border-right: 1px solid var(--se-color-border-soft);
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-right: var(--se-space-4);
  padding-right: var(--se-space-2);
}

.tables-card__content {
  flex: 1 1 auto;
  min-width: 0;
}

.tables-card__header {
  gap: var(--se-space-3);
  justify-content: space-between;
}

.tables-url span,
.tables-card__meta span {
  color: var(--se-color-text-muted);
  display: block;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
}

.tables-card h2 {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: 4px 0 0;
}

.tables-card__identity {
  margin-top: var(--se-space-4);
}

.tables-card__meta {
  gap: var(--se-space-2);
}

.tables-card__meta .v-icon {
  color: var(--se-color-primary);
}

.tables-card__meta strong {
  color: var(--se-color-text-body);
  display: block;
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
  overflow-wrap: anywhere;
}

.tables-alert,
.tables-url {
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  margin-top: var(--se-space-4);
  min-height: 48px;
}

.tables-alert {
  align-items: center;
  background: var(--se-color-warning-soft);
  color: #8a4c00;
  display: flex;
  gap: var(--se-space-2);
  padding: 10px 12px;
}

.tables-url {
  background: var(--se-color-surface-muted);
  gap: var(--se-space-3);
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
}

.tables-url strong {
  color: var(--se-color-text-body);
  display: block;
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
  overflow-wrap: anywhere;
}

.tables-copy {
  background: var(--se-color-surface) !important;
  border: 1px solid var(--se-color-border-soft);
  color: var(--se-color-primary) !important;
  flex: 0 0 auto;
}

.tables-copy--done {
  background: var(--se-color-success-soft) !important;
  color: #007a3d !important;
}

.tables-card__qr {
  align-items: center;
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  display: flex;
  justify-content: center;
  min-height: 256px;
  padding: var(--se-space-3);
}

.tables-qr-preview {
  align-items: center;
  display: flex;
  justify-content: center;
}

.tables-qr-preview ::v-deep svg,
.tables-qr-preview ::v-deep canvas,
.tables-qr-preview ::v-deep img {
  display: block;
  height: 224px;
  width: 224px;
}

.tables-qr-placeholder {
  align-items: center;
  color: var(--se-color-text-muted);
  display: flex;
  justify-content: center;
}

.tables-card__actions {
  align-items: stretch;
  flex-direction: column;
  gap: var(--se-space-2);
  justify-content: center;
  padding: 0;
}

.tables-card__actions .v-btn {
  margin: 0;
  min-width: 132px;
}

.tables-empty {
  align-items: center;
  border-color: var(--se-color-border) !important;
  color: var(--se-color-text-muted);
  display: flex;
  flex-direction: column;
  gap: var(--se-space-2);
  padding: 42px 24px;
  text-align: center;
}

.tables-empty h2 {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  margin: 0;
}

.tables-empty p {
  margin: 0;
}

@media (max-width: 960px) {
  .tables-card {
    grid-template-columns: 1fr;
  }

  .tables-card__actions {
    flex-direction: row;
  }

  .tables-card__actions .v-btn {
    flex: 1 1 0;
  }
}

@media (max-width: 720px) {
  .tables-action-bar,
  .tables-card__header,
  .tables-card__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .tables-add {
    width: 100%;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .tables-list-move,
  .tables-list-enter-active,
  .tables-list-leave-active,
  .tables-card,
  .tables-copy {
    transition:
      background-color var(--se-transition-fast),
      border-color var(--se-transition-fast),
      color var(--se-transition-fast),
      opacity var(--se-transition-standard),
      transform var(--se-transition-standard);
  }

  .tables-list-enter,
  .tables-list-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  .tables-card:hover {
    border-color: var(--se-color-primary) !important;
    transform: translateY(-1px);
  }
}
</style>
