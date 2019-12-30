<template lang="pug">
  div(style='width: 100%; height: 100%')
    TrajPlot(v-if='pluginName === "LQRPlugin" || pluginName === "DirectCollocationPlugin"'
             :trajectories='trajectories')
    ValueIterationPlot(v-if='pluginName == "ValueIterationPlugin"'
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
          return this.active.trajectories;
        default:
          return [];
      }
    },

    viPlanner() {
      return this.pluginName === "ValueIterationPlugin"
        ? this.active.viPlanner
        : null;
    }
  },

  methods: {}
};
</script>