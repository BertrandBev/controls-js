<template lang="pug">
Section(title="MPC")
  ValueInput(ref="nPts", :value.sync="params.nPts", label="Point count")
  .mb-3.mt-3(style="display: flex; align-items: center")
    ArrayInput(
      ref="uMin",
      style="flex: 1 0 auto; width: 0px",
      :array.sync="params.uBounds.min",
      label="uMin"
    )
    ArrayInput.ml-2(
      ref="uMax",
      style="flex: 1 0 auto; width: 0px",
      :array.sync="params.uBounds.max",
      label="uMax"
    )
  ValueInput(
    ref="dt",
    style="flex: 0 0 auto; width: 48px",
    :value.sync="params.dt",
    label="dt"
  )
  v-btn.mt-2(@click="runMPC", outlined, color="primary") run MPC optimisation
</template>

<script>
import Trajectory from "@/components/planners/trajectory.js";
import Section from "@/components/environments/utils/Section.vue";
import ArrayInput from "@/components/environments/utils/ArrayInput.vue";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import eig from "@eigen";
import _ from "lodash";
import pluginMixin from "@/components/environments/pluginMixin.js";
import MPC from "@/components/controllers/MPC.js";

export default {
  name: "MPCPlugin",

  mixins: [pluginMixin],

  components: {
    Section,
    ArrayInput,
    ValueInput,
  },

  props: {
    system: Object,
    systemRef: Object,
  },

  data: () => ({
    mpc: null,
    trajectory: null,
    params: {},
  }),

  computed: {
    trajectories() {
      return [this.trajectory];
    },
  },

  created() {
    this.params = _.cloneDeep(this.system.mpcParams());
    // Create trajectory
    this.trajectory = new Trajectory(this.system, true);
    this.trajectory.load(this.params.traj);
    // Create mpc
    this.mpc = new MPC(
      this.system,
      this.trajectory,
      this.params.dt,
      this.params.nPts,
      this.params.uBounds
    );
    this.reset();
  },

  methods: {
    reset() {
      if (this.trajectory.ready()) {
        const x0 = this.trajectory.getState(0);
        this.system.setState(x0);
      }
    },

    ready() {
      return this.trajectory.ready();
    },

    runMPC() {
      const xTraj = this.mpc.optimize(0);
    },

    updateSystem(t, dt) {
      if (this.ready() && !MPC.DEBUG) {
        // Update system ref
        const x = this.trajectory.getState(t);
        this.systemRef.setState(x);
        // return { u };
        // Update system
        const [xn, un] = this.system.shape;
        const xTraj = this.mpc.optimize(t);
        const u = xTraj[0].block(xn, 0, un, 1);
        // console.log(
        //   "TRAJ u:",
        //   this.trajectory.getCommand(t).get(0),
        //   "mpc u:",
        //   u.get(0)
        // );
        this.system.step(u, dt);
        if (this.system.graphics.traj) this.system.graphics.traj.data = xTraj;
        return { u };
      }
      return {};

      // Temp mdp command
    },
  },
};
</script>