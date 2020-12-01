<template lang="pug">
  div(style='width: 100%; height: 100%;')
    div(style='width: 100%; height: 100%;'
        ref='div')
</template>

<script>
import Plotly from "plotly.js-dist";
import _ from "lodash";

export default {
  name: "KalmanPlot",

  props: {
    kalmanFilter: Object
  },

  data: () => ({
    tPrev: 0
  }),

  computed: {},

  watch: {},

  mounted() {
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false,
      responsive: true
    };
    Plotly.newPlot(this.$refs.div, [], [], config);
    this.kalmanFilter.addWatcher(() => {
      this.update();
    });
  },

  beforeDestroy() {
    // this.trajectories.forEach(traj => traj.removeWatcher(this.update));
  },

  methods: {
    getGaussian(mu, sigma, nPts) {
      const s = 1 / (sigma * Math.sqrt(2 * Math.PI));
      const [x, y] = [[], []];
      const step = (6 * sigma) / nPts;
      for (let k = mu - 3 * sigma; k < mu + 3 * sigma; k += step) {
        const val = s * Math.exp(-0.5 * Math.pow((k - mu) / sigma, 2));
        x.push(k);
        y.push(val);
      }
      return { x, y };
    },

    update() {
      if (!this.$refs.div || !this.kalmanFilter.ready()) return;
      if (Date.now() - this.tPrev < 200) return;
      this.tPrev = Date.now();
      const sys = this.kalmanFilter.system;
      const mean = this.kalmanFilter.x;
      const cov = this.kalmanFilter.P;
      const data = sys.states.map((state, idx) => {
        const { x, y } = this.getGaussian(
          mean.get(idx),
          cov.get(idx, idx),
          40
        );
        return {
          x,
          y,
          name: state.name,
          type: "scatter",
          // xaxis: `x${idx}`,
          // yaxis: `y${idx}`
        };
      });
      const layout = {
        // grid: { rows: 2, columns: 2, pattern: "independent" },
        xaxis: {
          zeroline: false
        },
        // yaxis: {
        //   zeroline: false
        // },
        margin: {
          l: 40,
          r: 100,
          b: 60,
          t: 30,
          pad: 10
        }
        // legend: {
        //   orientation: "h",
        //   x: 0,
        //   y: -0.1
        // }
      };
      Plotly.react(this.$refs.div, data, layout);
    }
  }
};
</script>