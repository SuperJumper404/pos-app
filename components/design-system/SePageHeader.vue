<template>
  <header class="se-page-header">
    <div class="se-page-header__title-block">
      <span v-if="icon" class="se-page-header__icon" aria-hidden="true">
        <v-icon color="primary">{{ icon }}</v-icon>
      </span>
      <div class="se-page-header__text">
        <h1 class="se-page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="se-page-header__subtitle">
          {{ subtitle }}
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="se-page-header__actions">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<script>
export default {
  name: 'SePageHeader',
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
  },
}
</script>

<style scoped>
.se-page-header {
  align-items: center;
  background: var(--se-color-surface-muted);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  flex-wrap: wrap;
  gap: var(--se-space-4);
  justify-content: space-between;
  padding: 18px 20px;
}

.se-page-header__title-block {
  align-items: center;
  display: flex;
  gap: var(--se-space-3);
  min-width: 220px;
}

.se-page-header__icon {
  align-items: center;
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  display: inline-flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.se-page-header__title {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  font-weight: var(--se-weight-semibold);
  line-height: var(--se-line-tight);
  margin: 0;
}

.se-page-header__subtitle {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  line-height: 1.35;
  margin: 2px 0 0;
}

.se-page-header__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--se-space-2);
}

@media (max-width: 720px) {
  .se-page-header {
    align-items: stretch;
  }

  .se-page-header__actions {
    width: 100%;
  }

  .se-page-header__actions ::v-deep .v-btn,
  .se-page-header__actions ::v-deep .v-input {
    width: 100%;
  }
}
</style>
