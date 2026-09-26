<template>
  <section
    class="terminal-payment-status"
    :class="`terminal-payment-status--${state}`"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="terminal-payment-status__heading">
      <v-icon aria-hidden="true">{{ icon }}</v-icon>
      <h3>{{ title }}</h3>
      <strong>{{ amount }}</strong>
    </div>
    <p v-if="readerLabel" class="terminal-payment-status__reader">{{ readerLabel }}</p>
    <p>{{ message || defaultMessage }}</p>
    <div v-if="state === 'recovery' || canCancel" class="terminal-payment-status__actions">
      <v-btn
        v-if="state === 'recovery'"
        outlined
        color="primary"
        class="text-none"
        min-height="44"
        :disabled="busy"
        :loading="busy && !canceling"
        @click="$emit('retry')"
      >
        <v-icon left small>mdi-refresh</v-icon>
        Vérifier le paiement
      </v-btn>
      <v-btn
        v-if="canCancel || canceling"
        outlined
        class="text-none"
        min-height="44"
        :disabled="busy"
        :loading="canceling"
        @click="$emit('cancel')"
      >
        <v-icon left small>mdi-close-circle-outline</v-icon>
        Annuler le paiement
      </v-btn>
    </div>
  </section>
</template>

<script>
export default {
  props: {
    state: { type: String, default: 'idle' },
    readerLabel: { type: String, default: '' },
    amount: { type: String, default: '' },
    message: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    canceling: { type: Boolean, default: false },
    canCancel: { type: Boolean, default: false },
  },
  computed: {
    title() {
      if (this.canceling) return 'Annulation en cours'
      return {
        idle: 'Paiement par terminal',
        starting: 'Préparation du paiement',
        processing: 'Paiement en cours',
        succeeded: 'Paiement accepté',
        failed: 'Paiement refusé',
        canceled: 'Paiement annulé',
        recovery: 'Paiement à vérifier',
      }[this.state] || 'Paiement à vérifier'
    },
    icon() {
      return {
        idle: 'mdi-credit-card-wireless-outline',
        starting: 'mdi-timer-sand',
        processing: 'mdi-credit-card-wireless-outline',
        succeeded: 'mdi-check-circle-outline',
        failed: 'mdi-alert-circle-outline',
        canceled: 'mdi-close-circle-outline',
        recovery: 'mdi-alert-outline',
      }[this.state] || 'mdi-alert-outline'
    },
    defaultMessage() {
      if (this.canceling) return 'Confirmation du terminal en attente.'
      return {
        idle: 'Prêt à envoyer au terminal.',
        starting: 'Envoi au terminal en cours.',
        processing: 'Présentez la carte sur le terminal. Confirmation en attente.',
        succeeded: 'Les commandes sont payées et peuvent être clôturées.',
        failed: 'Les commandes restent à encaisser. Vous pouvez réessayer ou choisir un autre moyen.',
        canceled: 'Les commandes restent à encaisser.',
        recovery: 'Vérifiez le résultat avant un nouvel encaissement.',
      }[this.state] || 'Vérifiez le résultat du paiement.'
    },
  },
}
</script>

<style scoped>
.terminal-payment-status {
  border-top: 1px solid var(--se-color-border);
  color: var(--se-color-text-body);
  padding-top: 16px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.terminal-payment-status__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.terminal-payment-status h3 {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  min-width: 120px;
}

.terminal-payment-status strong {
  font-variant-numeric: tabular-nums;
}

.terminal-payment-status .v-icon {
  color: var(--se-color-primary);
}

.terminal-payment-status--succeeded .v-icon {
  color: #176638;
}

.terminal-payment-status--failed .v-icon {
  color: var(--se-color-danger);
}

.terminal-payment-status--recovery .v-icon,
.terminal-payment-status--canceled .v-icon {
  color: #805100;
}

.terminal-payment-status p {
  margin: 8px 0 0;
  max-width: 70ch;
}

.terminal-payment-status__reader {
  font-weight: 600;
}

.terminal-payment-status__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.terminal-payment-status__actions .v-btn {
  max-width: 100%;
  letter-spacing: 0;
}

.terminal-payment-status__actions .v-btn:focus-visible {
  outline: 2px solid var(--se-color-primary);
  outline-offset: 2px;
}

@media (max-width: 400px) {
  .terminal-payment-status__actions .v-btn {
    width: 100%;
  }
}
</style>
