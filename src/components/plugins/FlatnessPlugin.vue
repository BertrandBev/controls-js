<template lang="pug">
Block(title='Diff. Flatness')
  ValueInput.mt-3(:value.sync='params.duration'
             label='Travel duration')
  v-btn.mt-2(@click='buildTraj'
             outlined
             color='primary') update trajectory
</template>

<script>
import Trajectory from "@/components/planners/trajectory.js";
import Block from "./utils/Block.vue";
import pluginMixin from "./pluginMixin.js";
import MatrixInput from "./utils/MatrixInput.vue";
import ValueInput from "./utils/ValueInput.vue";
import eig from "@eigen";
import _ from "lodash";

const DT = 1 / 60;

export default {
  name: "FlatnessPlugin",

  mixins: [pluginMixin],

  components: {
    Block,
    MatrixInput,
    ValueInput
  },

  props: {
    system: Object,
    interactivePath: Object
  },

  data: () => ({
    simTraj: null,
    // Parameters
    params: {
      duration: 5
    }
  }),

  computed: {
    trajectories() {
      return [this.simTraj];
    }
  },

  created() {
    const { x, u } = this.system.trim();
    // Populate matrices
    // this.params = _.cloneDeep(this.system.lqrParams());
    this.simTraj = new Trajectory(this.system, false);
  },

  mounted() {
    this.setVisibility();
  },

  watch: {
    active() {
      this.setVisibility();
    },

    interactivePath() {
      if (this.interactivePath) {
        this.interactivePath.addUpdateListener(this.pathUpdated);
      }
    }
  },

  methods: {
    pathUpdated() {
      this.simTraj.clear();
      this.reset();
    },

    setVisibility() {
      if (this.interactivePath) this.interactivePath.setVisibility(this.active);
    },

    // Could be shared w/ dircol
    reset() {
      if (this.simTraj.ready()) {
        const x0 = this.simTraj.getState(0);
        this.system.setState(x0);
      } else {
        const x0 = this.system.trim().x;
        this.system.setState(x0);
      }
    },

    ready() {
      return this.simTraj.ready();
    },

    update(t, dt) {
      if (this.ready()) {
        const u = this.simTraj.getCommand(t);
        const x = this.simTraj.getState(t);
        this.system.setState(x);
        return { u };
      }
    },

    buildTraj() {
      const xy = this.interactivePath.getTraj(this.params.duration / DT);
      const arr = this.system.differentialFlatness(xy, DT);
      this.simTraj.set(arr, DT);
      this.$emit("activate", this);
    }
  }
};
</script>