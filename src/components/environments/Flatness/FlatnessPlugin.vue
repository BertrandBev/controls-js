<template lang="pug">
Section(title='Diff. Flatness')
  ValueInput.mt-3(:value.sync='params.duration'
             label='Travel duration')
  v-btn.mt-2(@click='buildTraj'
             outlined
             color='primary') update trajectory
</template>

<script>
import Trajectory from "@/components/planners/trajectory.js";
import Section from "@/components/environments/utils/Section.vue";
import pluginMixin from "@/components/environments/pluginMixin.js";
import MatrixInput from "@/components/environments/utils/MatrixInput.vue";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import eig from "@eigen";
import _ from "lodash";

const DT = 1 / 60;

export default {
  name: "FlatnessPlugin",

  mixins: [pluginMixin],

  components: {
    Section,
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
    this.simTraj = new Trajectory(this.system, true);
  },

  mounted() {
    this.$nextTick(() => this.buildTraj());
  },


  watch: {
    interactivePath() {
      if (this.interactivePath) {
        this.interactivePath.addUpdateListener(this.pathUpdated);
      }
    }
  },

  methods: {
    pathUpdated() {
      this.simTraj.clear();
    },

    reset() {
      this.buildTraj();
    },

    ready() {
      return this.simTraj.ready();
    },

    stepSystem() {
      return false;
    },

    updateSystem(t, dt) {
      if (this.ready()) {
        const u = this.simTraj.getCommand(t);
        const x = this.simTraj.getState(t);
        this.system.setState(x);
        return { u };
      }
    },

    buildTraj() {
      this.simTraj.clear();
      const xy = this.interactivePath.getTraj(this.params.duration / DT);
      const arr = this.system.differentialFlatness(xy, DT);
      this.simTraj.set(arr, DT);
    }
  }
};
</script>