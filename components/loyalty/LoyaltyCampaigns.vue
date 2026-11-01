<template>
  <section aria-label="Notifications Apple Wallet">
    <h2 class="text-h6 mb-3">Informer les adhérents</h2>
    <p>Préparez une mise à jour concernant une offre ou une information utile de la carte. Seuls les adhérents ayant accepté les offres et possédant une carte Apple Wallet enregistrée seront sélectionnés.</p>
    <v-alert v-if="notice" type="success" text role="status">{{ notice }}</v-alert>
    <div class="mb-4"><strong>Destinataires : </strong><span>{{ recipient ? recipient.name || recipient.cardNumber || 'Adhérent sélectionné' : 'Tous les adhérents éligibles' }}</span><v-btn v-if="recipient" text small class="text-none" :disabled="working" @click="$emit('clear-recipient')">Choisir tous les adhérents</v-btn></div>
    <form @submit.prevent="preview">
      <v-textarea v-model="message" outlined label="Offre ou information de la carte" rows="3" maxlength="200" counter="200" :disabled="working" hint="Pour un seul client, choisissez « Notifier » depuis l’onglet Clients." persistent-hint />
      <v-btn type="submit" color="primary" class="text-none mb-6" :disabled="working || !message.trim()" :loading="preparing">Vérifier les destinataires</v-btn>
    </form>
    <v-dialog v-model="confirming" max-width="520" :persistent="sending">
      <v-card v-if="draft">
        <v-card-title class="subtitle-1 se-modal-title">Confirmer la mise à jour Wallet</v-card-title>
        <v-card-text><p>{{ draft.message }}</p><p><strong>{{ draft.recipientCount }} carte(s) sélectionnée(s).</strong></p><p v-if="!draft.recipientCount">Aucune carte éligible pour ce message.</p><p class="mb-0">L’affichage de la notification dépend d’Apple Wallet et des réglages du client.</p></v-card-text>
        <v-card-actions><v-spacer /><v-btn text class="text-none" :disabled="sending" @click="confirming = false">Annuler</v-btn><v-btn color="primary" class="text-none" :loading="sending" :disabled="working || !draft.recipientCount" @click="send">Confirmer l’envoi</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <div class="d-flex align-center mb-3"><h2 class="text-h6">Historique des messages</h2><v-spacer /><v-btn text class="text-none" :disabled="working" @click="load">Actualiser</v-btn></div>
    <v-data-table :headers="headers" :items="loyalty.campaigns" :server-items-length="loyalty.campaignsTotal" :options.sync="options" :footer-props="{ 'items-per-page-options': [25, 50] }" :loading="loyalty.busy" disable-sort no-data-text="Aucun message préparé.">
      <template #[`item.createdAt`]="{ item }">{{ date(item.createdAt) }}</template>
      <template #[`item.status`]="{ item }">{{ status(item) }}</template>
    </v-data-table>
    <p class="text-body-2 text--secondary mt-3">« Traité » décrit le traitement de la mise à jour, sans confirmer la réception ou la lecture. Patientez cinq minutes entre deux envois.</p>
  </section>
</template>
<script>
export default {
  props: { recipient: { type: Object, default: null } },
  data: () => ({ message: '', requestId: '', draft: null, confirming: false, preparing: false, sending: false, notice: '', options: { page: 1, itemsPerPage: 25 },
    headers: [{ text: 'Date', value: 'createdAt' }, { text: 'Message', value: 'message' }, { text: 'Sélectionnés', value: 'recipientCount' }, { text: 'Traités', value: 'processed' }, { text: 'Ignorés', value: 'skipped' }, { text: 'État', value: 'status' }] }),
  computed: { loyalty() { return this.$store.state.loyalty }, working() { return this.preparing || this.sending || this.loyalty.busy } },
  watch: {
    message() { this.draft = null; this.requestId = ''; this.notice = '' },
    recipient() { this.draft = null; this.requestId = ''; this.confirming = false },
    options: { deep: true, immediate: true, handler() { this.load() } },
  },
  methods: {
    load() { return this.$store.dispatch('loyalty/loadCampaigns', { page: this.options.page, pageSize: this.options.itemsPerPage }) },
    date(value) { return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '' },
    status(item) { return Number(item.retrying) ? 'À réessayer' : { draft: 'Préparé', queued: 'En attente', processed: 'Traité' }[item.status] || item.status },
    async preview() {
      if (this.preparing || this.sending || this.loyalty.busy || !this.message.trim()) return
      if (!this.requestId) this.requestId = crypto.randomUUID()
      const requestId = this.requestId
      this.preparing = true; this.notice = ''
      try {
        const draft = await this.$store.dispatch('loyalty/createCampaignDraft', { requestId, message: this.message.trim(), target: this.recipient ? { type: 'member', memberId: this.recipient.id } : { type: 'all' } })
        if (draft && !this._isDestroyed && requestId === this.requestId) { this.draft = draft; this.confirming = true }
      } finally { this.preparing = false }
    },
    async send() {
      if (!this.draft || !this.draft.recipientCount || this.sending || this.loyalty.busy) return
      this.sending = true
      try {
        const result = await this.$store.dispatch('loyalty/sendCampaign', { campaignId: this.draft.id, confirmed: true })
        if (result && !this._isDestroyed) { this.confirming = false; this.notice = 'Mise à jour enregistrée. Le traitement est en attente.'; this.draft = null; this.requestId = ''; await this.load() }
      } finally { this.sending = false }
    },
  },
}
</script>
