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
    ValueIterationPlot(v-if='plotType === "VI" && viPlanner'
                       ref='trajPlot'
                       :valueIterationPlanner='viPlanner')
  template(v-slot:bar)
    //- div(style='display: flex; align-items: center; overflow: hide')
    v-select(v-model='plotType'
             style='max-width: 100px'
             :items="['time', 'VI']"
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
    v-spacer
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import SecondOrder, { traj } from "./secondOrder.js";
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
  name: "SecondOrder",

  components: {
    ModelLayout,
    TrajPlot,
    ValueIterationPlot
  },

  mixins: [worldMixin],

  data: () => ({
    plotType: "VI",
    // State
    system: null,
    controller: null,
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
    this.controller = new LQR(this.system, params.x0, params.u0);
    this.trajectory = new Trajectory(this.system);
    this.trajectory.load(traj);
    // Get open loop traj
    const openLoopController = new OpenLoopController(
      this.system,
      this.trajectory
    );
    // openLoopController.reset();
    // Get model predictive traj
    this.mpc = new MPC(this.system, this.trajectory, traj.dt, 10, {
      min: [-5],
      max: [5]
    });
    const [xn, un] = this.system.shape;
    const x0 = this.trajectory.getState(0);
    this.system.setState(x0);
    this.simTrajectory = this.mpc.simulate(
      this.trajectory.dt,
      this.trajectory.duration
    );
  },

  mounted() {
    this.system.createGraphics(this.two, this.scale);
  },

  methods: {
    runValueIteration() {
      this.viPlanner = new ValueIterationPlanner(
        this.system,
        [{ min: -4, max: 4, count: 50 }, { min: -5, max: 5, count: 50 }],
        [{ min: -2, max: 2, count: 2 }],
        [eig.Matrix.fromArray([0, 0])],
        0.11
      );
      this.viPlanner.run();
      this.viPlanner.simulate(5);
    },

    reset() {
      worldMixin.methods.reset.call(this);
      const [xn, un] = this.system.shape;
      const x0 = this.trajectory.getState(0);
      this.system.setState(x0);
    },

    plot() {
      this.$refs.trajPlot.update();
    },

    optimize() {
      const xStart = eig.Matrix.fromArray([-2, 0]);
      const xEnd = eig.Matrix.fromArray([2, 0]);
      const uMax = 5;
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
          min: eig.Matrix.fromArray([-uMax]),
          max: eig.Matrix.fromArray([uMax])
        },
        anchors
      );
      let [x, t] = collocation.optimize();
      x = this.system.reverse(x);
      this.trajectory.set(x, (2 * t) / x.length);
    },

    download() {
      this.trajectory.print();
    },

    update() {
      // TODO: add FPS meter
      let u = new eig.Matrix(1, 1);
      const trajX = this.trajectory.ready()
        ? this.trajectory.get(this.t)
        : null;
      if (this.mode === "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        // const u = this.controller.getCommand();
        this.system.step(u, this.dt, this.mouseTarget);
      } else if (this.mode === "Optim" && this.trajectory.ready()) {
        const x = this.trajectory.getState();
        u = this.trajectory.getCommand();
        this.system.setState(x);
      } else if (this.mode === "MPC") {
        u = this.mpc.getCommand(this.t);
        this.system.step(u, this.dt, this.mouseTarget);
      }
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, u, trajX);
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>