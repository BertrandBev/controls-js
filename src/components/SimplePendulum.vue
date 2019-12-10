<template lang='pug'>
v-row(ref='container'
      justify='center')
  div.canvas(ref='canvas')
  div(v-if='mode === "VI"'
      ref='plot')
</template>

<script>
import Two from "two.js";
import { SimplePendulum } from "@/components/simplePendulum.js";
import { LQR } from "@/components/controls.js";
import worldMixin from "@/components/worldMixin.js";
import _ from "lodash";
const eig = require("../../lib/eigen-js/eigen.js");
import { ValueIterationPlanner } from "@/components/valueIterationPlanner.js";
import { Interpolator } from "./utils.js";
import { ModelPredictiveControl } from "@/components/modelPredictiveControl.js";

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const FRAME_COLOR = "#455A64";

const GEOM = {
  thickness: 8,
  radius: 16,
  length: 128
};

export default {
  name: "SimplePendulum",

  mixins: [worldMixin],

  data: () => ({
    // Graphics
    graphics: null,
    // State
    system: null,
    controller: null,
    updateTime: Date.now(),
    mode: "MPC"
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return GEOM.length / this.system.params.l;
    }
  },

  watch: {
    mouseDragging() {
      if (!this.mouseDragging) {
        // this.VI.rollout(5);
        // console.log("rolled out");
      }
    }
  },

  created() {
    const xTop = eig.DenseMatrix.fromArray([Math.PI, 0]);
    const params = {
      x0: eig.DenseMatrix.fromArray([Math.PI - 0.2, 0]), // xTop,
      u0: eig.DenseMatrix.fromArray([0])
    };
    this.system = new SimplePendulum(params);
    this.controller = new LQR(this.system, params.x0, params.u0);

    // ValueIteration
    const p = this.system.params;
    const maxThetaDot = 2 * Math.sqrt(p.g / p.l);
    this.VI = new ValueIterationPlanner(
      this.system,
      [
        { min: -Math.PI, max: Math.PI, count: 50 },
        { min: -maxThetaDot, max: maxThetaDot, count: 50 }
      ],
      [{ min: -5, max: 5, count: 2 }],
      [xTop, xTop.mul(-1)],
      0.1
    );
    this.VI.run(1000);
    this.VI.rollout(5);
  },

  mounted() {
    // Create pole
    const pole = this.two.makeRectangle(
      0,
      GEOM.length / 2,
      GEOM.thickness,
      GEOM.length + GEOM.thickness
    );
    pole.fill = COLOR;
    pole.linewidth = 2;
    const circle = this.two.makeCircle(0, GEOM.length, GEOM.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;
    this.graphics = this.two.makeGroup(pole, circle);

    this.two.bind("update", this.update).play();

    // Register plot area for VI
    // this.VI.plot(this.$refs.plot);

    // Setup MPD
    this.interpolator = new Interpolator(true);
    const top = eig.DenseMatrix.fromArray([Math.PI, 0, 0]);
    this.interpolator.set([top, top], 0.1);
    this.mdp = new ModelPredictiveControl(
      this.system,
      this.interpolator,
      0.05,
      10,
      { min: [-20], max: [20] }
    );
    this.mdp.getCommand(); // TEMP
    eig.GC.flush();
  },

  methods: {
    update() {
      // TODO: add FPS meter
      const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
      if (dt < 0.02) {
        return;
      }

      let u = new eig.DenseMatrix(1, 1)
      if (this.mode == "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        u = this.controller.getCommand();
        this.system.step(u, dt, this.mouseTarget);
      } else if (this.mode == "MPC" && this.mdp) {
        const xTraj = this.mdp.getCommand();
        const [xn, un] = this.system.shape();
        u = xTraj[0].block(xn, 0, un, 1);
        this.system.step(u, dt, this.mouseTarget);
      } else {
        // Rollout mode
        const x = this.VI.sampleRollout(Date.now() / 1000);
        eig.GC.set(this.system, "x", x);
      }
      // Graphic update
      this.graphics.rotation = -this.system.x.vGet(0);
      this.graphics.translation.set(this.width / 2, this.height / 2);
      this.updateTime = Date.now();
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
.canvas {
  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAATUlEQVRYR+3VMQoAMAhD0Xq3HNs75QgtdOqsg1C+u5C8JWF7r8ELAiCAAAIIIIBARyAz75BLKg96a47HA5RrP48tAQIggAACCCDwhcABvG5/oRsc6n0AAAAASUVORK5CYII=")
    center center;
}
</style>