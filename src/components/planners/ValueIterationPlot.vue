<template lang="pug">
  div(style='width: 100%; height: 100%;')
    div(style='width: 100%; height: 100%;'
        ref='div')
</template>

<script>
import Plotly from "plotly.js-dist";
import _ from "lodash";

export default {
  name: "TrajPlot",

  props: {
    valueIterationPlanner: Object // [ trajs ]
  },

  data: () => ({
    series: []
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

    // Add watchers
    this.valueIterationPlanner.addWatcher(this.update);
    this.update();
  },

  beforeDestroy() {
    this.valueIterationPlanner.removeWatcher(this.update);
  },

  methods: {
    update() {
      const xGrid = this.valueIterationPlanner.V.grid;
      const data = [
        {
          z: this.valueIterationPlanner.getMatrix(),
          x0: xGrid[0].min,
          dx: (xGrid[0].max - xGrid[0].min) / xGrid[0].count,
          y0: xGrid[1].min,
          dy: (xGrid[1].max - xGrid[1].min) / xGrid[1].count,
          type: "heatmap"
        }
      ];
      const layout = {
        xaxis: { title: "theta (rad)" },
        yaxis: { title: "thetaDot (rad)" },
        margin: {
          l: 70,
          r: 100,
          b: 60,
          t: 30,
          pad: 10
        }
      };
      Plotly.react(this.$refs.div, data, layout);
    }
  }
};
</script>