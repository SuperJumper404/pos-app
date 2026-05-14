<template>
  <div>
    <v-snackbar
      v-for="(notification, index) in notifications"
      :key="notification.id"
      :value="true"
      :timeout="notification.timeout"
      :color="notificationColor(notification.type)"
      :style="{ top: `${16 + index * 64}px` }"
      top
      right
      app
      @input="remove(notification.id)"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-3" color="white">
          {{ notificationIcon(notification.type) }}
        </v-icon>
        <span>{{ notification.message }}</span>
        <v-spacer></v-spacer>
        <v-btn icon small @click="remove(notification.id)">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
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
    notificationColor(type) {
      const colors = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'primary',
      }

      return colors[type] || colors.info
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
