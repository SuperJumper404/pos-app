<template>
  <div class="app-notifications">
    <v-snackbar
      v-for="(notification, index) in notifications"
      :key="notification.id"
      :value="true"
      :timeout="notification.timeout"
      :style="{ marginBottom: `${index * 12}px` }"
      absolute
      transition="slide-y-transition"
      :class="['app-notification', `app-notification--${notification.type}`]"
      @input="remove(notification.id)"
    >
      <div class="app-notification-content">
        <v-icon class="app-notification-icon" small>
          {{ notificationIcon(notification.type) }}
        </v-icon>
        <span class="app-notification-message">
          {{ notification.message }}
        </span>
        <v-spacer></v-spacer>
        <v-btn
          icon
          small
          class="app-notification-close"
          @click="remove(notification.id)"
        >
          <v-icon small>mdi-close</v-icon>
        </v-btn>
        <div
          class="app-notification-progress"
          :style="{ animationDuration: `${notification.timeout}ms` }"
        ></div>
      </div>
    </v-snackbar>
  </div>
</template>

<script>
export default {
  name: 'AppNotifications',
  computed: {
    notifications() {
      return this.$store.get('notifications/items')
    },
  },
  methods: {
    remove(id) {
      this.$store.dispatch('notifications/remove', id)
    },
    notificationIcon(type) {
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information',
      }

      return icons[type] || icons.info
    },
  },
}
</script>

<style scoped>
.app-notifications {
  align-items: flex-end;
  bottom: 16px;
  display: flex;
  flex-direction: column-reverse;
  pointer-events: none;
  position: fixed;
  right: 16px;
  z-index: 3000;
}

.app-notification {
  pointer-events: auto;
  position: static !important;
}

.app-notification ::v-deep .v-snack {
  position: static !important;
}

.app-notification ::v-deep .v-snack__wrapper {
  background: #ffffff !important;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  box-shadow: 0 10px 18px rgba(24, 24, 27, 0.12);
  color: #27272a;
  max-width: calc(100vw - 48px);
  min-height: 0;
  overflow: hidden;
  width: 356px;
}

.app-notification ::v-deep .v-snack__content {
  min-height: 0;
  padding: 12px !important;
}

.app-notification-content {
  align-items: center;
  display: flex;
  gap: 12px;
  min-height: 0;
  min-width: 0;
  padding-bottom: 2px;
  position: relative;
  width: 100%;
}

.app-notification-icon {
  align-items: center;
  color: currentColor !important;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 20px !important;
  height: 20px;
  line-height: 1;
  margin-right: 0;
  width: 20px;
}

.app-notification-message {
  color: #27272a;
  flex: 1 1 auto;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  padding-right: 0;
}

.app-notification-close {
  color: #71717a !important;
  height: 22px;
  margin-right: -2px;
  opacity: 0.65;
  width: 22px;
}

.app-notification-close ::v-deep .v-icon {
  color: currentColor !important;
}

.app-notification-progress {
  animation-name: notification-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  background: currentColor;
  bottom: -12px;
  height: 2px;
  left: -12px;
  opacity: 0.28;
  position: absolute;
  width: calc(100% + 24px);
}

.app-notification--success ::v-deep .v-snack__wrapper {
  border-color: #00e676;
}

.app-notification--success .app-notification-icon,
.app-notification--success .app-notification-progress {
  color: #00e676 !important;
}

.app-notification--error ::v-deep .v-snack__wrapper {
  border-color: #ffc107;
}

.app-notification--error .app-notification-icon,
.app-notification--error .app-notification-progress {
  color: #ffc107 !important;
}

.app-notification--warning ::v-deep .v-snack__wrapper {
  border-color: #ffc107;
}

.app-notification--warning .app-notification-icon,
.app-notification--warning .app-notification-progress {
  color: #ffc107 !important;
}

.app-notification--info ::v-deep .v-snack__wrapper {
  border-color: #1976d2;
}

.app-notification--info .app-notification-icon,
.app-notification--info .app-notification-progress {
  color: #1976d2 !important;
}

@keyframes notification-progress {
  from {
    width: calc(100% + 24px);
  }

  to {
    width: 0;
  }
}

@media (max-width: 960px) {
  .app-notifications {
    bottom: 12px;
    left: 12px !important;
    right: 12px !important;
  }

  .app-notification ::v-deep .v-snack__wrapper {
    max-width: none;
    width: 100%;
  }
}
</style>
