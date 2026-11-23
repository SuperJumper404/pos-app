<template>
  <main class="board">
    <header class="announcement" aria-live="polite">
      <strong v-if="announcement">Commande {{ announcement.ordernumber }} prête</strong>
      <span v-else>Suivi des commandes</span>
      <button v-if="!audioEnabled" type="button" @click="enableSound">Activer le son</button>
    </header>
    <p v-if="offline" class="notice" role="status">Connexion interrompue · Actualisation en cours</p>
    <div class="lanes">
      <section v-for="lane in lanes" :key="lane.status" :class="'lane lane-' + lane.status">
        <h1>{{ lane.title }}</h1>
        <ul>
          <li v-for="order in visible(lane.status)" :key="order.id">{{ order.ordernumber }}</li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script>
const lanes = [
  { status: 1, title: 'En attente' },
  { status: 2, title: 'En préparation' },
  { status: 3, title: 'Prêtes' },
]
const PAGE_SIZE = 10

export default {
  layout: 'empty',
  middleware: 'auth',
  data() {
    return { lanes, orders: [], pages: [0, 0, 0], announcement: null, offline: false, audioEnabled: false }
  },
  mounted() {
    this.running = true
    this.queue = []
    this.rotation = {}
    this.refresh()
    this.resume = () => {
      if (!document.hidden) return
      this.baseline = false
      this.clearAnnouncements()
    }
    document.addEventListener('visibilitychange', this.resume)
  },
  beforeDestroy() {
    this.running = false
    clearTimeout(this.pollTimer)
    Object.values(this.rotation).forEach(clearInterval)
    this.clearAnnouncements()
    document.removeEventListener('visibilitychange', this.resume)
    if (this.audio) this.audio.close().catch(() => {})
  },
  methods: {
    visible(status) {
      const start = this.pages[status - 1] * PAGE_SIZE
      return this.orders.filter(o => o.status === status).slice(start, start + PAGE_SIZE)
    },
    clearAnnouncements() {
      clearTimeout(this.announcementTimer)
      this.announcement = null
      this.queue = []
    },
    accept(rows) {
      const ready = rows.filter(o => o.status === 3)
      const key = o => o.id + '/' + o.entered
      const current = new Set(ready.map(key))
      const previous = new Set(this.orders.filter(o => o.status === 3).map(key))
      this.queue = this.queue.filter(o => current.has(key(o)))
      if (this.announcement && !current.has(key(this.announcement))) {
        clearTimeout(this.announcementTimer)
        this.announcement = null
      }
      if (this.baseline) this.queue.push(...ready.filter(o => !previous.has(key(o))))
      this.orders = rows
      this.baseline = true
      for (const { status } of lanes) {
        const count = Math.ceil(rows.filter(o => o.status === status).length / PAGE_SIZE)
        if (this.pages[status - 1] >= count) this.$set(this.pages, status - 1, 0)
        if (count <= 1) {
          clearInterval(this.rotation[status])
          delete this.rotation[status]
        } else if (!this.rotation[status]) {
          this.rotation[status] = setInterval(() => {
            const pages = Math.ceil(this.orders.filter(o => o.status === status).length / PAGE_SIZE)
            this.$set(this.pages, status - 1, (this.pages[status - 1] + 1) % pages)
          }, 30000)
        }
      }
      this.nextAnnouncement()
    },
    nextAnnouncement() {
      if (this.announcement || !this.queue.length) return
      this.announcement = this.queue.shift()
      if (this.audioEnabled && this.audio.state === 'running') {
        const tone = this.audio.createOscillator()
        const gain = this.audio.createGain()
        const now = this.audio.currentTime
        tone.frequency.value = 740
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
        tone.connect(gain)
        gain.connect(this.audio.destination)
        tone.start(now)
        tone.stop(now + 0.33)
      }
      this.announcementTimer = setTimeout(() => {
        this.announcement = null
        this.nextAnnouncement()
      }, 5000)
    },
    async enableSound() {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) return
      this.audio = this.audio || new Audio()
      try { await this.audio.resume() } catch (_) { return }
      this.audioEnabled = this.audio.state === 'running'
    },
    async refresh() {
      try {
        if (document.hidden) return
        const response = await this.$axios.get('/baseurl/api/v1/service-points/call-orders', {
          headers: { Authorization: 'Bearer ' + this.$store.state.users.user.token },
          timeout: 7000,
          skipGlobalErrorNotification: true,
        })
        if (!this.running || document.hidden) return
        this.offline = false
        this.accept(response.data.data)
      } catch (error) {
        if (!this.running) return
        this.baseline = false
        this.clearAnnouncements()
        this.offline = true
        if ([401, 403].includes(error.response?.status)) {
          this.running = false
          this.orders = []
          await this.$store.dispatch('clearAuthentication')
          await this.$store.dispatch('users/clearAuthenticatedUser')
          require('../helpers/sessionAuth').clearStoredAuth(localStorage, { preserveTableAccessToken: false })
          this.$router.replace('/login')
        }
      } finally {
        if (this.running) this.pollTimer = setTimeout(this.refresh, 2000)
      }
    },
  },
}
</script>

<style scoped>
.board { min-height: 100vh; background: #f8faf9; color: #172720; padding: 2vh 2vw; font-family: inherit; }
.announcement { height: 13vh; display: flex; align-items: center; justify-content: center; position: relative; font-size: clamp(22px, 3.5vw, 72px); }
.announcement strong { color: #126444; }
.announcement button { position: absolute; right: 0; top: 0; font: inherit; font-size: 15px; padding: 8px; text-decoration: underline; }
.notice { text-align: center; margin: 0; color: #833d00; }
.lanes { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 2vw; }
.lane { border-top: .65vh solid var(--ink); color: var(--ink); }
.lane-1 { --tile: #e1e6e8; --ink: #33454c; }
.lane-2 { --tile: #ffda78; --ink: #523900; }
.lane-3 { --tile: #b2edcc; --ink: #104d32; }
.lane h1 { font-size: clamp(16px,2.7vw,60px); margin: 1.4vh 0 2vh; text-align: center; }
.lane ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1vh .7vw; }
.lane li { display: grid; place-items: center; min-height: 12vh; background: var(--tile); border-radius: 8px; font-size: clamp(18px,4vw,88px); font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
</style>
