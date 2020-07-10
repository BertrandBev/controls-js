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
  v-btn.mt-2(@click='runValueIteration'
             outlined
             :disabled='running'
             :loading='running'
             color='primary') run value iteration
</template>

<script>
import ValueIterationPlanner from "@/components/planners/valueIterationPlanner.js";
import Trajectory from "@/components/planners/trajectory.js";
import Block from "@/components/environments/utils/Block.vue";
import eig from "@eigen";
import _ from "lodash";
import pluginMixin from "@/components/environments/pluginMixin.js";

export default {
  name: "ValueIterationPlugin",

  mixins: [pluginMixin],

  components: {
    Block
  },

  props: {
    system: Object
  },

  data: () => ({
    viPlanner: null,
    running: false,
    xPrev: null,
    simTraj: null,
    // Parameters
    t: 0,
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
    this.simTraj = new Trajectory(this.system, true);
  },

  methods: {
    ready() {
      return this.simTraj.ready();
    },

    reset() {
      const { x } = this.system.trim();
      this.system.setState(x);
    },

    simulate() {
      const sequence = this.viPlanner.simulate(30);
      this.simTraj.set(sequence, this.dt);
      this.simTraj.reset(this.t);
    },

    update(params) {
      this.t = params.t;
    },

    updateSystem(t, dt) {
      if (this.ready()) {
        if (this.system.x !== this.xPrev) {
          console.log("Delta detected, re-run");
          this.simulate();
        }
        const u = this.simTraj.getCommand(t);
        const x = this.simTraj.getState(t);
        eig.GC.set(this, "xPrev", x);
        this.system.setState(x);
        return { u };
      }

      return { u: eig.Matrix.fromArray([0]) };
    },

    runValueIteration() {
      // Get from system
      const params = _.cloneDeep(this.params);
      params.xGrid.forEach(spec => (spec.nPts = this.nPts));
      params.dt = this.dt;
      this.running = true;
      setTimeout(() => {
        const converged = this.viPlanner.run(params);
        // if (converged) this.simulate();
        this.running = false;
      }, 25);
    }
  }
};
</script>