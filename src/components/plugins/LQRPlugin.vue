<template lang="pug">
Block(title='LQR')
  MatrixInput(:matrix='this.controller.Q')
  v-text-field.mt-3(v-model.number='qWeight'
              label='Q weight'
              outlined
              dense
              hide-details)
  v-text-field.mt-3(v-model.number='rWeight'
              label='R weight'
              outlined
              dense
              hide-details)
  v-btn.mt-2(@click='runLQR'
             outlined
             color='primary') update LQR
</template>

<script>
import LQR from "@/components/controllers/LQR.js";
import Trajectory from "@/components/planners/trajectory.js";
import Block from "./utils/Block.vue";
import pluginMixin from "./pluginMixin.js";
import MatrixInput from "./utils/MatrixInput.vue";
import eig from "@eigen";

const DT = 0.01;

export default {
  name: "LQRPlugin",

  mixins: [pluginMixin],

  components: {
    Block,
    MatrixInput
  },

  props: {
    system: Object
  },

  data: () => ({
    //
    controller: null,
    linearTraj: null,
    simTraj: null,
    // Parameters
    qWeight: 10,
    rWeight: 1
  }),

  computed: {
    trajectories() {
      return [this.linearTraj, this.simTraj];
    }
  },

  created() {
    const { x, u } = this.system.trim();
    this.controller = new LQR(this.system, x, u);
    this.simTraj = new Trajectory(this.system, false);
    this.linearTraj = new Trajectory(this.system, false);
    this.runLQR();
  },

  methods: {
    reset() {
      const { x } = this.system.trim();
      this.system.setState(x);
    },

    update(t, dt) {
      if (this.controller.K) {
        const u = this.controller.getCommand(this.system.x, t);
        this.system.step(u, dt);
      }
    },

    runLQR() {
      this.controller.solve(this.qWeight, this.rWeight);
      // Simulate the system
      const duration = 10;
      let arr = this.controller.simulate(1, DT, duration);
      this.simTraj.set(arr, DT);
      arr = this.controller.linearSimulate(1, DT, duration);
      this.linearTraj.set(arr, DT);
      this.$emit("update", this);
    }
  }
};
</script>