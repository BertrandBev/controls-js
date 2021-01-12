<template lang="pug">
div(style="width: 100%; height: 100%")
  div(style="width: 100%; height: 100%", ref="div")
</template>

<script>
import Plotly from "plotly.js-dist";
import _ from "lodash";

export default {
  name: "ParticlePlot",

  props: {
    particleFilter: Object,
  },

  data: () => ({
    tPrev: 0,
  }),

  computed: {},

  watch: {},

  mounted() {
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false,
      responsive: true,
    };
    Plotly.newPlot(this.$refs.div, [], [], config);
    this.particleFilter.addWatcher(() => {
      this.update();
    });
  },

  beforeDestroy() {
    // this.trajectories.forEach(traj => traj.removeWatcher(this.update));
  },

  methods: {
    update() {
      if (!this.$refs.div || !this.particleFilter.ready()) return;
      if (Date.now() - this.tPrev < 500) return;
      this.tPrev = Date.now();
      const particles = this.particleFilter.particles;
      const px = [];
      const py = [];
      particles.forEach((particle) => {
        px.push(particle.system.x.get(0));
        py.push(particle.system.x.get(1));
      });
      const data = [
        {
          x: px,
          type: "histogram",
          opacity: 0.5,
          marker: {
            color: "green",
          },
          name: "x", 
        },
        {
          x: py,
          type: "histogram",
          opacity: 0.5,
          marker: {
            color: "red",
          },
          name: "y", 
        },
      ];
      const layout = {
        // grid: { rows: 2, columns: 2, pattern: "independent" },
        xaxis: {
          zeroline: false,
        },
        // yaxis: {
        //   zeroline: false
        // },
        margin: {
          l: 40,
          r: 100,
          b: 60,
          t: 30,
          pad: 10,
        },
        // legend: {
        //   orientation: "h",
        //   x: 0,
        //   y: -0.1
        // }
      };
      Plotly.react(this.$refs.div, data, layout);
    },
  },
};
</script>