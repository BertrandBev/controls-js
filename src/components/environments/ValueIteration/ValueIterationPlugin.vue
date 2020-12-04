<template lang="pug">
Section(title="Value Iteration")
  ValueInput(ref='dt'
             :value.sync='params.dt'
             label='Timestep')
  ArrayInput.mt-3(ref='pointCount'
             :array.sync='params.x.nPts'
             label='State point count')
  ArrayInput.mt-3(ref='uMin'
             :array.sync='params.u.min'
             label='uMin')
  ArrayInput.mt-3(ref='uMax'
             :array.sync='params.u.max'
             label='uMax')
  ArrayInput.mt-3(ref='uPointCount'
             :array.sync='params.u.nPts'
             label='u point count')
  v-btn.mt-3(
    @click="runValueIteration",
    outlined,
    :disabled="running",
    :loading="running",
    color="primary"
  ) run value iteration
  v-btn.mt-2(@click="simulate", outlined, color="primary") simulate
</template>

<script>
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import ArrayInput from "@/components/environments/utils/ArrayInput.vue";
import ValueIterationPlanner2D from "@/components/planners/valueIterationPlanner2D.js";
import Trajectory from "@/components/planners/trajectory.js";
import Section from "@/components/environments/utils/Section.vue";
import eig from "@eigen";
import _ from "lodash";
import pluginMixin from "@/components/environments/pluginMixin.js";

export default {
  name: "ValueIterationPlugin",

  mixins: [pluginMixin],

  components: {
    Section,
    ValueInput,
    ArrayInput
  },

  props: {
    system: Object,
  },

  data: () => ({
    viPlanner: null,
    running: false,
    xPrev: null,
    // Parameters
    params: {}
  }),

  computed: {
  },

  created() {
    this.viPlanner = new ValueIterationPlanner2D(this.system);
    this.trajectory = new Trajectory(this.system, false);
    this.params = _.cloneDeep(this.system.valueIterationParams());
  },

  methods: {
    ready() {
      return this.trajectory.ready();
    },

    reset() {
      if (this.ready()) {
        this.trajectory.reset(0);
      } else {
        const { x } = this.system.trim();
        this.system.setState(x);
      }
    },

    simulate(x0) {
      if (!x0) x0 = this.system.x;
      this.viPlanner.simulate(x0, this.trajectory, 30);
      this.trajectory.reset(this.t);
    },

    updateSystem(t, dt) {
      if (this.ready()) {
        this.t = t;
        if (this.system.x !== this.xPrev) {
          console.log("Delta detected, re-run");
          this.simulate();
        }
        const u = this.trajectory.getCommand(t);
        const x = this.trajectory.getState(t);
        eig.GC.set(this, "xPrev", x);
        this.system.setState(x);
        return { u };
      }

      return { u: new eig.Matrix([0]) };
    },

    runValueIteration() {
      // Get from system
      this.running = true;
      setTimeout(() => {
        const converged = this.viPlanner.run(this.params);
        if (converged) this.simulate();
        this.running = false;
      }, 25);
    },
  },
};
</script>