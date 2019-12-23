<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:sheet)
    TrajPlot(v-if='plotType === "time"'
             ref='trajPlot'
             :system='system'
             :trajectories='[trajectory, simTrajectory]')
  //-   ValueIterationPlot(v-if='plotType === "VI" && viPlanner'
  //-                      ref='trajPlot'
  //-                      :valueIterationPlanner='viPlanner')
  template(v-slot:bar)
    //- div(style='display: flex; align-items: center; overflow: hide')
    v-select(v-model='plotType'
             style='max-width: 100px'
             :items="['time']"
             label='plot'
             filled dark dense solo
             hide-details)
    v-select(v-model='mode'
             style='max-width: 120px'
             :items="['Controls', 'Optim', 'MPC']"
             label='plot'
             filled dark dense solo
             hide-details)
    v-btn(text dark
          @click='plot') plot
    v-btn(text dark
          @click='optimize') optimize
    v-btn(text dark
          @click='download') download
    v-btn(text dark
      @click='runValueIteration') valueIteration
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import DoublePendulum, { traj } from "./doublePendulum.js";
import _ from "lodash";
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import LQR from "@/components/controllers/LQR.js";
import OpenLoopController from "@/components/controllers/openLoopController.js";
import worldMixin from "@/components/worldMixin.js";
import { test } from "@/components/directCollocation.js";
import Trajectory from "@/components/planners/trajectory.js";
import { DirectCollocation } from "@/components/directCollocation.js";
import MPC from "@/components/controllers/MPC.js";
import TrajPlot from "@/components/planners/TrajPlot.vue";
import ValueIterationPlot from "@/components/planners/ValueIterationPlot.vue";
import ValueIterationPlanner from "@/components/planners/valueIterationPlanner.js";

export default {
  name: "DoublePendulum",

  components: {
    ModelLayout,
    TrajPlot,
    ValueIterationPlot
  },

  mixins: [worldMixin],

  data: () => ({
    plotType: "time",
    // State
    system: null,
    controller: null,
    mode: "Controls",
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
      x0: eig.Matrix.fromArray([Math.PI, Math.PI, 0, 0]),
      u0: eig.Matrix.fromArray([0, 0])
    };
    this.system = new DoublePendulum(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
    LQR.testJacobian(this.system);

    this.trajectory = new Trajectory(this.system);
    this.trajectory.load(traj);
    // // Get open loop traj
    // const openLoopController = new OpenLoopController(
    //   this.system,
    //   this.trajectory
    // );
    // // openLoopController.reset();
    // // Get model predictive traj
    this.mpc = new MPC(this.system, this.trajectory, traj.dt, 10, {
      min: [-20, -20],
      max: [20, 20]
    });
    const [xn, un] = this.system.shape;
    const x0 = this.trajectory.getState(0);
    this.system.setState(x0);
    this.simTrajectory = this.mpc.simulate(
      this.trajectory.dt,
      this.trajectory.duration
    );
    console.log("sim", this.simTrajectory);
    // this.simTrajectory.setLegend(this.system.statesCommands);
  },

  mounted() {
    this.system.createGraphics(this.two, this.scale);
  },

  methods: {
    optimize() {
      const xStart = eig.Matrix.fromArray([0, 0, 0, 0]);
      const xEnd = eig.Matrix.fromArray([Math.PI, Math.PI, 0, 0]);
      const uMax = 8;
      const nPoints = 50;
      const anchors = [
        { t: 0, x: xStart },
        // { t: 0.5, x: xEnd },
        { t: 1, x: xEnd }
      ];

      const collocation = new DirectCollocation(
        this.system,
        nPoints,
        {
          min: eig.Matrix.fromArray([-uMax, -uMax]),
          max: eig.Matrix.fromArray([uMax, uMax])
        },
        anchors
      );
      let [x, t] = collocation.optimize(30);
      x = this.system.reverse(x);
      this.trajectory.set(x, (2 * t) / x.length);
    },

    runValueIteration() {
      // this.viPlanner = new ValueIterationPlanner(
      //   this.system,
      //   [{ min: -4, max: 4, count: 50 }, { min: -5, max: 5, count: 50 }],
      //   [{ min: -2, max: 2, count: 2 }],
      //   [eig.Matrix.fromArray([0, 0])],
      //   0.11
      // );
      // this.viPlanner.run();
      // this.viPlanner.simulate(5);
    },

    reset() {
      worldMixin.methods.reset.call(this);
      // const [xn, un] = this.system.shape;
      // const x0 = this.trajectory.get(0).block(0, 0, xn, 1);
      // this.system.setState(x0);
    },

    plot() {
      this.$refs.trajPlot.update();
    },

    download() {
      this.trajectory.dump();
    },

    update() {
      // TODO: add FPS meter
      let u = new eig.Matrix(2, 1);
      const xTraj = this.trajectory.ready()
        ? this.trajectory.getState(this.t)
        : null;
      if (this.mode === "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        const u = this.controller.getCommand();
        this.system.step(u, this.dt, this.mouseTarget);
      } else if (this.mode === "Optim" && this.trajectory.ready()) {
        u = this.trajectory.getCommand(this.t);
        this.system.setState(xTraj);
      } else if (this.mode === "MPC") {
        u = this.mpc.getCommand(this.t);
        this.system.step(u, this.dt, this.mouseTarget);
      }
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, xTraj);
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>