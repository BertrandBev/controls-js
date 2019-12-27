<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    LQRPlugin(ref='lqrPlugin'
              :system='system')
    ValueIterationPlugin(ref='viPlugin'
                         :system='system')
    DirectCollocationPlugin(ref='dircolPlugin'
                            :system='system')
  template(v-slot:sheet)
    PlotSheet(ref='plotSheet'
              :lqrPlugin='$refs.lqrPlugin'
              :viPlugin='$refs.viPlugin'
              :dircolPlugin='$refs.dircolPlugin')
  template(v-slot:bar)
    ControlBar(:plotSheet='$refs.plotSheet')
    v-btn(text dark
          @click='optimize') optimize
    v-btn(text dark
          @click='download') download
    v-spacer
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import SecondOrder, { traj } from "./secondOrder.js";
import OpenLoopController from "@/components/controllers/openLoopController.js";
import worldMixin from "@/components/worldMixin.js";
import Trajectory from "@/components/planners/trajectory.js";
import MPC from "@/components/controllers/MPC.js";
// New imports
import LQRPlugin from "@/components/plugins/LQRPlugin.vue";
import ValueIterationPlugin from "@/components/plugins/ValueIterationPlugin.vue";
import DirectCollocationPlugin from "@/components/plugins/DirectCollocationPlugin.vue";
import PlotSheet from "@/components/models/PlotSheet.vue";
import ControlBar from "@/components/models/ControlBar.vue";

export default {
  name: "SecondOrder",

  components: {
    ModelLayout,
    LQRPlugin,
    ValueIterationPlugin,
    DirectCollocationPlugin,
    PlotSheet,
    ControlBar
  },

  mixins: [worldMixin],

  data: () => ({
    plotType: "VI",
    // State
    system: null,
    mode: "MPC",
    trajectory: null,
    simTrajectory: null,
    mpc: null,
    viPlanner: null
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return 96;
    },

    dt() {
      return 1 / 60;
    }
  },

  created() {
    const params = {
      x0: eig.Matrix.fromArray([0, 0]),
      u0: eig.Matrix.fromArray([0])
    };
    this.system = new SecondOrder(params);
    this.trajectory = new Trajectory(this.system);
    this.trajectory.load(traj);
    // Get open loop traj
    const openLoopController = new OpenLoopController(
      this.system,
      this.trajectory
    );
    // openLoopController.reset();
    // Get model predictive traj

    // this.mpc = new MPC(this.system, this.trajectory, traj.dt, 10, {
    //   min: [-5],
    //   max: [5]
    // });
    // const [xn, un] = this.system.shape;
    // const x0 = this.trajectory.getState(0);
    // this.simTrajectory = this.mpc.simulate(
    //   x0,
    //   this.trajectory.dt,
    //   this.trajectory.duration
    // );
  },

  mounted() {
    this.system.createGraphics(this.two, this.scale);
  },

  methods: {
    reset() {
      worldMixin.methods.reset.call(this);
      const [xn, un] = this.system.shape;
      const x0 = this.trajectory.getState(0);
      this.system.setState(x0);
    },

    plot() {
      this.$refs.trajPlot.update();
    },

    optimize() {},

    download() {
      this.trajectory.print();
    },

    update() {
      // TODO: add FPS meter
      let u = new eig.Matrix(1, 1);
      // const trajX = this.trajectory.ready()
      //   ? this.trajectory.get(this.t)
      //   : null;
      if (this.mode === "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        // const u = this.controller.getCommand();
        this.system.step(u, this.dt, this.mouseTarget);
      } else if (this.mode === "Optim") {
        // const x = this.trajectory.getState();
        // u = this.trajectory.getCommand();
        // this.system.setState(x);
      } else if (this.mode === "MPC") {
        // u = this.mpc.getCommand(this.t);
        // this.system.step(u, this.dt, this.mouseTarget);
      }
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, u);
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>