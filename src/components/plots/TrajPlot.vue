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
    trajectories: Array // [ trajs ]
  },

  data: () => ({
    series: [],
  }),

  computed: {},

  watch: {
    trajectories: {
      handler(newValue, oldValue) {
        if (oldValue) {
          oldValue.forEach(traj => traj.removeWatcher(this.update));
        }
        if (newValue) {
          newValue.forEach(traj => traj.addWatcher(this.update));
        }
        this.update();
      },
      immediate: true
    }
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
    this.update()
  },

  beforeDestroy() {
    this.trajectories.forEach(traj => traj.removeWatcher(this.update));
  },

  methods: {
    getSeries(traj, idx) {
      const xList = [];
      const tList = [];
      traj.array.forEach((val, k) => {
        tList.push(k * traj.dt);
        xList.push(val.get(idx));
      });
      return [tList, xList];
    },

    update() {
      const data = [];
      if (!this.$refs.div) return;
      this.trajectories.forEach((traj, trajId) => {
        if (!traj.ready()) return;
        const dim = traj.dim();
        for (let idx = 0; idx < dim; idx++) {
          const [t, x] = this.getSeries(traj, idx);
          let name = _.get(traj.getLegend(), `[${idx}].name`, `${idx}`);
          name = this.trajectories.length > 0 ? `t${trajId}_${name}` : name;
          const show = _.get(traj.getLegend(), `[${idx}].show`, false);
          data.push({
            x: t,
            y: x,
            type: "scatter",
            name,
            hoverinfo: "skip",
            line: { dash: trajId > 0 ? "dashdot" : "solid" },
            visible: show || "legendonly"
          });
        }
      });
      const layout = {
        xaxis: {
          title: "time (t)",
          fixedrange: true
          //   zeroline: false
        },
        yaxis: {
          fixedrange: true
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