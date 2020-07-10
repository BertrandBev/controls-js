<template lang="pug">
Block(title='LQR')
  MatrixInput(:matrix='params.Q'
              label='Q')
  MatrixInput.mt-2(:matrix='params.R'
              label='R')
  ValueInput.mt-3(:value.sync='params.simDuration'
             label='Sim duration')
  ValueInput.mt-3(:value.sync='params.simEps'
             label='Sim disturbance')
  div.mt-3(style='display: flex; align-items: center')
    v-checkbox.pa-0.pb-4(v-model='params.disengage'
                         label='Auto disengage'
                         hide-details
                         small)
    v-btn.ml-3(@click='enabled = true'
               outlined color='red'
               :disabled='enabled') Engage
  v-btn.mt-2(@click='runLQR'
             outlined
             color='primary') update LQR
</template>

<script>
import LQR from "@/components/controllers/LQR.js";
import Trajectory from "@/components/planners/trajectory.js";
import Block from "@/components/environments/utils/Block.vue";
import pluginMixin from "@/components/environments/pluginMixin.js";
import MatrixInput from "@/components/environments/utils/MatrixInput.vue";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import eig from "@eigen";
import _ from "lodash";

const DT = 1 / 60;

export default {
  name: "LQRPlugin",

  mixins: [pluginMixin],

  components: {
    Block,
    MatrixInput,
    ValueInput
  },

  props: {
    system: Object
  },

  data: () => ({
    controller: null,
    linearTraj: null,
    simTraj: null,
    // Parameters
    params: {},
    enabled: true
  }),

  computed: {
    trajectories() {
      return [this.linearTraj, this.simTraj];
    },

    controllerEnabled() {
      return !this.params.disengage || this.enabled;
    }
  },

  created() {
    const { x, u } = this.system.trim();
    // Populate matrices
    this.params = _.cloneDeep(this.system.lqrParams());
    this.controller = new LQR(this.system, x, u);
    this.simTraj = new Trajectory(this.system, false);
    this.linearTraj = new Trajectory(this.system, false);
    this.runLQR();
  },

  methods: {
    reset() {
      const { x } = this.system.trim();
      this.system.setState(x);
      this.enabled = true;
    },

    ready() {
      return this.controllerEnabled && this.controller.ready();
    },

    updateSystem(t, dt) {
      if (this.ready()) {
        const u = this.controller.getCommand(this.system.x, t);
        if (this.params.disengage && u.norm() > this.params.divergenceThres) {
          this.enabled = false;
        }
        this.system.step(u, dt);
        return { u };
      }
    },

    runLQR() {
      this.controller.solve(this.params);
      // Simulate the system
      const duration = this.params.simDuration;
      const dx = this.params.simEps;
      let arr = this.controller.simulate(dx, DT, duration);
      this.simTraj.set(arr, DT);
      arr = this.controller.linearSimulate(dx, DT, duration);
      this.linearTraj.set(arr, DT);
      this.$emit("activate", this);
    }
  }
};
</script>