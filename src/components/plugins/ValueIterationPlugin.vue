<template lang="pug">
Block(title='Value Iteration')
  v-text-field(v-model.number='dt'
              label='Timestep'
              outlined
              dense
              hide-details)
  v-text-field.mt-3(v-model.number='nPts'
              label='Point count'
              outlined
              dense
              hide-details)
  v-btn.mt-2(@click='update'
             outlined
             :disabled='running'
             :loading='running'
             color='primary') run value iteration
</template>

<script>
import ValueIterationPlanner from "@/components/planners/valueIterationPlanner.js";
import Trajectory from "@/components/planners/trajectory.js";
import Block from "./Block.vue";
import eig from "@eigen";
import _ from "lodash";

export default {
  components: {
    Block
  },

  props: {
    system: Object
  },

  data: () => ({
    viPlanner: null,
    running: false,
    // Parameters
    dt: 0,
    nPts: 0
  }),

  computed: {
    params() {
      return this.system.valueIterationParams();
    }
  },

  created() {
    this.viPlanner = new ValueIterationPlanner(this.system);
    this.dt = this.params.dt;
    this.nPts = this.params.xGrid[0].nPts;
  },

  methods: {
    update() {
      // Get from system
      const params = _.cloneDeep(this.params);
      params.xGrid.forEach(spec => (spec.nPts = this.nPts));
      params.dt = this.dt;
      this.running = true;
      setTimeout(() => {
        this.viPlanner.run(params);
        this.running = false;
      }, 25);
    }
  }
};
</script>