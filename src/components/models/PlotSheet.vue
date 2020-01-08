<template lang="pug">
  div(style='width: 100%; height: 100%')
    TrajPlot(v-if='showTraj'
             :trajectories='trajectories')
    ValueIterationPlot(v-if='pluginName == "ValueIterationPlugin"'
                       :valueIterationPlanner='viPlanner')
    KalmanPlot(v-if='pluginName == "KalmanFilterPlugin"'
               :kalmanFilter='kalmanFilter')
</template>

<script>
import TrajPlot from "@/components/plots/TrajPlot.vue";
import ValueIterationPlot from "@/components/plots/ValueIterationPlot.vue";
import KalmanPlot from "@/components/plots/KalmanPlot.vue";
import _ from "lodash";

export default {
  name: "PlotSheet",

  components: {
    TrajPlot,
    ValueIterationPlot,
    KalmanPlot
  },

  props: {
    pluginGroup: Object
  },

  data: () => ({}),

  watch: {},

  computed: {
    active() {
      return _.get(this.pluginGroup, "active");
    },

    pluginName() {
      return _.get(this.active, "name");
    },

    trajectories() {
      switch (this.pluginName) {
        case "LQRPlugin":
        case "DirectCollocationPlugin":
        case "FlatnessPlugin":
          return this.active.trajectories;
        default:
          return [];
      }
    },

    showTraj() {
      return this.trajectories.length > 0;
    },

    viPlanner() {
      return this.pluginName === "ValueIterationPlugin"
        ? this.active.viPlanner
        : null;
    },

    kalmanFilter() {
      return this.pluginName === "KalmanFilterPlugin"
        ? this.active.kalmanFilter
        : null;
    }
  },

  methods: {}
};
</script>