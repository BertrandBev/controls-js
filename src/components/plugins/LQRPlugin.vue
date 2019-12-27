<template lang="pug">
Block(title='LQR')
  v-text-field(v-model.number='qWeight'
              label='Q weight'
              outlined
              dense
              hide-details)
  v-text-field.mt-3(v-model.number='rWeight'
              label='R weight'
              outlined
              dense
              hide-details)
  v-btn.mt-2(@click='update'
             outlined
             color='primary') update LQR
</template>

<script>
import LQR from "@/components/controllers/LQR.js";
import Trajectory from "@/components/planners/trajectory.js";
import Block from "./Block.vue";

export default {
  components: {
    Block
  },

  props: {
    system: Object
  },

  data: () => ({
    controller: null,
    linearTraj: null,
    simTraj: null,
    // Parameters
    qWeight: 10,
    rWeight: 1
  }),

  created() {
    const { x, u } = this.system.trim();
    this.controller = new LQR(this.system, x, u);
    this.simTraj = new Trajectory(this.system, false);
    this.linearTraj = new Trajectory(this.system, false);
    this.update();
  },

  methods: {
    update() {
      this.controller.solve(this.qWeight, this.rWeight);
      // Simulate the system
      const dt = 0.01;
      const duration = 10;
      let arr = this.controller.simulate(1, dt, duration);
      this.simTraj.set(arr, dt);
      arr = this.controller.linearSimulate(1, dt, duration);
      this.linearTraj.set(arr, dt);
    }
  }
};
</script>