<template lang="pug">
div(style='width: 100%; height: 100%;'
    ref='div')
</template>

<script>
import Plotly from "plotly.js-dist";
import _ from "lodash";

export default {
  name: "ValueIterationPlot",

  props: {
    valueIterationPlanner: Object,
    trajectory: Object,
  },

  data: () => ({
    series: [],
  }),

  computed: {
    names() {
      return this.valueIterationPlanner.system.states.map((st) => st.name);
    },
  },

  watch: {
    trajectory: {
      handler(newValue, oldValue) {
        if (oldValue) oldValue.removeWatcher(this.update);
        if (newValue) newValue.addWatcher(this.update);
        this.update();
      },
      immediate: true,
    },
  },

  mounted() {
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false,
      responsive: true,
    };
    Plotly.newPlot(this.$refs.div, [], [], config);
    this.$refs.div.on('plotly_click', data => {
      this.onclick(data);
    });

    // Add watchers
    this.valueIterationPlanner.addWatcher(this.update);
    this.update();
  },

  beforeDestroy() {
    this.valueIterationPlanner.removeWatcher(this.update);
    this.trajectory.removeWatcher(this.update);
  },

  methods: {
    onclick(data) {
      if (data.points && data.points.length > 0) {
        const pt = data.points[0];
        this.$emit('onclick', [pt.x, pt.y]);
      }
    },

    getXY() {
      const xList = [];
      const yList = [];
      this.trajectory.array.forEach((val, k) => {
        xList.push(val.get(0))
        yList.push(val.get(1))
      });
      return [xList, yList];
    },

    update() {
      if (!this.valueIterationPlanner.V) {
        return;
      }
      const xGrid = this.valueIterationPlanner.V.grid;
      const mat = this.valueIterationPlanner.getMatrix();
      const data = [
        {
          z: mat,
          x0: xGrid[0].min,
          dx: (xGrid[0].max - xGrid[0].min) / xGrid[0].nPts,
          y0: xGrid[1].min,
          dy: (xGrid[1].max - xGrid[1].min) / xGrid[1].nPts,
          type: "heatmap",
        },
      ];
      // Add trajectory
      if (this.trajectory.ready()) {
        const [x, y] = this.getXY();
        const trajData = {
          x,
          y,
          type: "scatter"
        };
        data.push(trajData);
      }
      const layout = {
        xaxis: { title: this.names[0], fixedrange: true },
        yaxis: { title: this.names[1], fixedrange: true },
        margin: {
          l: 70,
          r: 100,
          b: 60,
          t: 30,
          pad: 10,
        },
      };
      Plotly.react(this.$refs.div, data, layout);
    },
  },
};
</script>