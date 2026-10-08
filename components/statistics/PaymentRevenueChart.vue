<template>
  <div class="payment-revenue-chart">
    <div v-if="empty" class="payment-revenue-chart__empty">
      Aucun revenu sur cette période
    </div>
    <div v-else class="payment-revenue-chart__canvas-wrap">
      <canvas
        ref="canvas"
        class="payment-revenue-chart__canvas"
        aria-label="Revenus par moyen de paiement"
        role="img"
      ></canvas>
    </div>
  </div>
</template>

<script>
let chartModulePromise = null

const loadChartModule = () => {
  if (!chartModulePromise) {
    chartModulePromise = import('chart.js').then((module) => {
      module.Chart.register(
        module.BarController,
        module.BarElement,
        module.CategoryScale,
        module.Legend,
        module.LineController,
        module.LineElement,
        module.LinearScale,
        module.PointElement,
        module.Tooltip
      )
      return module.Chart
    })
  }
  return chartModulePromise
}

export default {
  name: 'PaymentRevenueChart',
  props: {
    chartConfig: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      chart: null,
      renderToken: 0,
    }
  },
  computed: {
    empty() {
      return !(
        this.chartConfig &&
        this.chartConfig.data &&
        Array.isArray(this.chartConfig.data.labels) &&
        this.chartConfig.data.labels.length
      )
    },
  },
  watch: {
    chartConfig: {
      deep: true,
      handler() {
        this.renderChart()
      },
    },
  },
  mounted() {
    this.renderChart()
  },
  beforeDestroy() {
    this.destroyChart()
  },
  methods: {
    destroyChart() {
      if (!this.chart) return
      this.chart.destroy()
      this.chart = null
    },
    async renderChart() {
      if (this.empty) {
        this.destroyChart()
        return
      }

      const token = ++this.renderToken
      await this.$nextTick()
      if (token !== this.renderToken || !this.$refs.canvas) return

      const Chart = await loadChartModule()
      if (token !== this.renderToken || !this.$refs.canvas) return

      this.destroyChart()
      this.chart = new Chart(this.$refs.canvas.getContext('2d'), {
        type: 'bar',
        data: this.chartConfig.data,
        options: this.chartConfig.options,
      })
    },
  },
}
</script>

<style scoped>
.payment-revenue-chart {
  padding: 18px 20px 16px;
}

.payment-revenue-chart__canvas-wrap {
  height: 320px;
  position: relative;
}

.payment-revenue-chart__canvas {
  display: block;
  width: 100%;
}

.payment-revenue-chart__empty {
  align-items: center;
  color: var(--se-color-text-muted);
  display: flex;
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-semibold);
  justify-content: center;
  min-height: 260px;
}

@media (max-width: 720px) {
  .payment-revenue-chart {
    padding: 16px;
  }

  .payment-revenue-chart__canvas-wrap {
    height: 280px;
  }
}
</style>
