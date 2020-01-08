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
    series: []
  }),

  computed: {},

  watch: {
    // trajectories: {
    //   handler(newValue, oldValue) {
    //     if (oldValue) {
    //       oldValue.forEach(traj => traj.removeWatcher(this.update));
    //     }
    //     if (newValue) {
    //       newValue.forEach(traj => traj.addWatcher(this.update));
    //     }
    //     this.update();
    //   },
    //   immediate: true
    // }
  },

  mounted() {
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false,
      responsive: true
    };
    Plotly.newPlot(this.$refs.div, [], [], config);
    this.update();
  },

  beforeDestroy() {
    // this.trajectories.forEach(traj => traj.removeWatcher(this.update));
  },

  methods: {
    update() {
      if (!this.$refs.div) return;
      const trace1 = {
        x: [1, 2, 3],
        y: [4, 5, 6],
        type: "scatter"
      };
      const trace2 = {
        x: [20, 30, 40],
        y: [50, 60, 70],
        xaxis: "x2",
        yaxis: "y2",
        type: "scatter"
      };
      const data = [trace1, trace2];
      const layout = {
        grid: { rows: 2, columns: 2, pattern: "independent" },
        xaxis: {
          title: "time (t)"
          //   zeroline: false
        },
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