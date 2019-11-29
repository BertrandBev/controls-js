<template lang="pug">
  div(style='display: flex; width: 100%; flex-direction: column;')
    div.pb-2(style='display: flex; flex: 0 0 auto; align-content: center; background: white')
      v-checkbox.ml-2(v-for='serie, idx in series'
                      :key='`serie_${idx}`'
                      v-model='serie.show'
                      :label='serie.name'
                      hide-details
                      dense)
    div(ref='div' style='flex: 1 0 auto')
</template>

<script>
import Plotly from "plotly.js-dist";
import _ from "lodash";

export default {
  props: {
    system: Object,
    interpolator: Object
  },

  data: () => ({
    series: []
  }),

  computed: {},

  watch: {
    system: {
      handler() {
        this.series = _.cloneDeep([
          ...this.system.states(),
          ...this.system.commands()
        ]);
        this.series.forEach((s, idx) => (s.idx = idx));
      },
      immediate: true
    },

    series: {
      handler() {
        this.plot();
      },
      deep: true
    }
  },

  mounted() {
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false
    };
    Plotly.newPlot(this.$refs.div, [], [], config);
  },

  methods: {
    plot() {
      if (this.interpolator.ready()) {
        const nPts = 10;
        const data = this.series
          .filter(s => s.show)
          .map((s, idx) => {
            const [t, x] = this.interpolator.getList(s.idx, nPts);
            return {
              x: t,
              y: x,
              type: "scatter",
              name: s.name,
              hoverinfo: 'skip',
              line: { shape: "spline" }
            };
          });
        const layout = {
          yaxis: { title: "" },
          xaxis: {
            title: "time (t)"
          }
        };
        Plotly.react(this.$refs.div, data, layout);
      }
    }
  }
};
</script>