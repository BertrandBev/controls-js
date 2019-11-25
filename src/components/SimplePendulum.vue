<template lang='pug'>
v-row(ref='container'
      justify='center')
  div.canvas(ref='canvas')
  div(ref='plot')
</template>

<script>
import Two from "two.js";
import { SimplePendulum } from "@/components/simplePendulum.js";
import { LQR } from "@/components/controls.js";
import mouseMixin from "@/components/mouseMixin.js";
import _ from "lodash";
import Hammer from "hammerjs";
const eig = require("../../lib/eigen-js/eigen.js");
import { ValueIterationPlanner } from "@/components/valueIterationPlanner.js";

const HEIGHT = 512;
const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const FRAME_COLOR = "#455A64";

export default {
  name: "SimplePendulum",

  mixins: [mouseMixin],

  data: () => ({
    thickness: 8,
    radius: 16,
    length: 128,
    // Graphics
    objPendulum: null,
    // State
    pendulum: null,
    controller: null,
    updateTime: Date.now()
  }),

  computed: {
    height() {
      return HEIGHT;
    },

    width() {
      return this.$refs.container.clientWidth;
    }
  },

  watch: {
    mouseDragging() {
      if (!this.mouseDragging) {
        this.VI.rollout(Date.now() / 1000, Date.now() / 1000 + 5);
      }
    }
  },

  created() {
    const xTop = eig.DenseMatrix.fromArray([Math.PI, 0]);
    const params = {
      x0: eig.DenseMatrix.fromArray([0, 0]), // xTop,
      u0: eig.DenseMatrix.fromArray([0])
    };
    this.system = new SimplePendulum(params);
    this.controller = new LQR(this.system, params.x0, params.u0);

    // TEST
    const p = this.system.params;
    const maxThetaDot = 2 * Math.sqrt(p.g / p.l);
    this.VI = new ValueIterationPlanner(
      this.system,
      [
        { min: -Math.PI, max: Math.PI, count: 50 },
        { min: -maxThetaDot, max: maxThetaDot, count: 50 }
      ],
      [{ min: -5, max: 5, count: 2 }],
      [xTop, xTop.negated()],
      0.1
    );
    this.VI.run(1000);
    this.VI.rollout(Date.now() / 1000, Date.now() / 1000 + 5);
  },

  mounted() {
    const params = { width: this.width, height: this.height };
    const two = new Two(params).appendTo(this.$refs.canvas);

    // Frame
    const frame = two.makeGroup(
      two.makeLine(-this.width / 3, 0, this.width / 3, 0),
      two.makeLine(0, -this.width / 6, 0, this.width / 6)
    );
    frame.translation.set(this.width / 2, this.height / 2);
    frame.fill = FRAME_COLOR;

    // Create pole
    const pole = two.makeRectangle(
      0,
      this.length / 2,
      this.thickness,
      this.length + this.thickness
    );
    pole.fill = COLOR;
    pole.linewidth = 2;
    const circle = two.makeCircle(0, this.length, this.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;
    this.objPendulum = two.makeGroup(pole, circle);

    two.bind("update", this.update).play();
    // this.update()
    // two.update()

    // Register plot area for VI
    this.VI.plot(this.$refs.plot);
  },

  methods: {
    update() {
      // TODO: add FPS meter
      if (this.mode == "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
        const u = this.controller.getCommand();
        this.system.step(u, dt, this.mouseTarget);
      } else {
        // Rollout mode
        const x = this.VI.sampleRollout(Date.now() / 1000);
        eig.GC.set(this.system, "x", x);
      }
      // Graphic update
      this.objPendulum.rotation = -this.system.x.vGet(0);
      this.objPendulum.translation.set(this.width / 2, this.height / 2);
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