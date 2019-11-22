<template lang='pug'>
v-row(ref='container'
      justify='center')
  div.canvas(ref='canvas')
</template>

<script>
import Two from "two.js";
import { SimplePendulum, LQR } from "@/components/simplePendulum.js";
import Controls from "@/components/controls.js";
import _ from "lodash";
import Hammer from "hammerjs";
const eig = require('../../lib/eigen-js/eigen.js')

const HEIGHT = 512;
const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const FRAME_COLOR = "#455A64";

export default {
  name: "SimplePendulum",

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
    width() {
      return this.$refs.container.clientWidth;
    }
  },

  created() {
    const params = _.clone({
      mu: 0.5,
      x0: eig.DenseMatrix.fromArray([[Math.PI], [0]]),
      u0: eig.DenseMatrix.fromArray([[0]])
    });
    this.pendulum = new SimplePendulum(params);
    this.controller = new LQR(this.pendulum, params.x0, params.u0);
  },

  mounted() {
    const params = { width: this.width, height: HEIGHT };
    const two = new Two(params).appendTo(this.$refs.canvas);

    // Frame
    const frame = two.makeGroup(
      two.makeLine(-this.width / 3, 0, this.width / 3, 0),
      two.makeLine(0, -this.width / 6, 0, this.width / 6)
    );
    frame.translation.set(this.width / 2, HEIGHT / 2);
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
    // rect.noStroke();

    const circle = two.makeCircle(0, this.length, this.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;

    this.objPendulum = two.makeGroup(pole, circle);

    // two.update();
    // this.update()
    two.bind("update", this.update).play();

    // Handle touch events
    const canvas = this.$refs.canvas;
    document.addEventListener("mouseup", ev => {
      this.pendulum.target = null;
    });
    canvas.addEventListener("mousedown", ev => {
      this.pendulum.target = {
        x: ev.offsetX - this.width / 2,
        y: ev.offsetY - HEIGHT / 2
      };
    });
    canvas.addEventListener("mousemove", ev => {
      if (this.pendulum.target) {
        this.pendulum.target = {
          x: ev.offsetX - this.width / 2,
          y: ev.offsetY - HEIGHT / 2
        };
      }
    });
  },

  methods: {
    update() {
      const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
      const a = Date.now();
      const u = this.controller.getCommand();
      this.pendulum.step(u, dt);
      const angle = this.pendulum.x.get(0, 0)
      this.objPendulum.rotation = -angle;
      // this.objPendulum.rotation += 0.1;
      this.objPendulum.translation.set(this.width / 2, HEIGHT / 2);
      this.updateTime = Date.now();
      // Run GC
      eig.GC.flush()
      const b = Date.now();
      // console.log('total time', b - a)
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