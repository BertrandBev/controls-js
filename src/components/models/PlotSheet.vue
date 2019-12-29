<template lang="pug">
  div(style='width: 100%; height: 100%')
    TrajPlot(v-if='activeName === "LQRPlugin" || "DirectCollocationPlugin"'
             :trajectories='trajectories')
    ValueIterationPlot(v-if='activeName == "ValueIterationPlugin"'
                       :valueIterationPlanner='viPlanner')
</template>

<script>
import TrajPlot from "@/components/planners/TrajPlot.vue";
import ValueIterationPlot from "@/components/planners/ValueIterationPlot.vue";
import _ from "lodash";

export default {
  name: "PlotSheet",

  components: {
    TrajPlot,
    ValueIterationPlot
  },

  props: {
    active: Object,
    plugins: Array
  },

  data: () => ({}),

  watch: {},

  computed: {
    activeName() {
      return _.get(this.active, "name");
    },

    trajectories() {
      switch (this.activeName) {
        case "LQRPlugin":
        case "DirectCollocationPlugin":
          return this.active.trajectories;
        default:
          return [];
      }
    },

    viPlanner() {
      return this.activeName === "ValueIterationPlugin"
        ? this.active.viPlanner
        : null;
    }
  },

  methods: {}
};
</script>