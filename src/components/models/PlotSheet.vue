<template lang="pug">
  div(style='width: 100%; height: 100%')
    // LQR trajectories
    TrajPlot(v-if='plot == "lqr"'
             :trajectories='lqrTraj')
    ValueIterationPlot(v-if='plot == "VI"'
                       :valueIterationPlanner='viPlanner')
    TrajPlot(v-if='plot == "dircol"'
             :trajectories='dircolTraj')
</template>

<script>
import TrajPlot from "@/components/planners/TrajPlot.vue";
import ValueIterationPlot from "@/components/planners/ValueIterationPlot.vue";

export default {
  name: "PlotSheet",

  components: {
    TrajPlot,
    ValueIterationPlot
  },

  props: {
    lqrPlugin: Object,
    viPlugin: Object,
    dircolPlugin: Object
  },

  data: () => ({
    plot: ""
  }),

  watch: {
    plots() {
      this.plot = this.plots.length > 0 ? this.plots[0] : "";
    }
  },

  computed: {
    plots() {
      const plots = [];
      if (this.lqrPlugin) plots.push("lqr");
      if (this.viPlugin) plots.push("VI");
      if (this.dircolPlugin) plots.push("dircol");
      return plots;
    },

    lqrTraj() {
      return this.lqrPlugin
        ? [this.lqrPlugin.linearTraj, this.lqrPlugin.simTraj]
        : [];
    },

    dircolTraj() {
      return this.dircolPlugin ? [this.dircolPlugin.simTraj] : [];
    },

    viPlanner() {
      return this.viPlugin ? this.viPlugin.viPlanner : null;
    }
  },

  methods: {
  }
};
</script>