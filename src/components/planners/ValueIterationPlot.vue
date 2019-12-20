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
    this.valueIterationPlanner.onChange(() => {
      this.update();
    });
  },

  methods: {
    update() {
      const data = [
        {
          z: this.valueTensor.getMatrix(),
          x0: this.xGrid[0].min,
          dx: (this.xGrid[0].max - this.xGrid[0].min) / this.xGrid[0].count,
          y0: this.xGrid[1].min,
          dy: (this.xGrid[1].max - this.xGrid[1].min) / this.xGrid[1].count,
          type: "heatmap"
        }
      ];
      const layout = {
        xaxis: { title: "theta (rad)" },
        yaxis: { title: "thetaDot (rad)" },
        margin: {
          l: 40,
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