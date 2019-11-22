<template lang='pug'>
v-row(ref='container'
      justify='center')
  div.canvas(ref='canvas')
  div(ref='svgDiv', v-html='refreshSvg' style='width: 32px; height: 32px')
</template>

<script>
import Two from "two.js";
import { Acrobot } from "@/components/acrobot.js";
import { LQR } from "@/components/controls.js";
import _ from "lodash";
import Hammer from "hammerjs";
import refreshSvg from "@assets/refresh.svg";
const eig = require("../../lib/eigen-js/eigen.js");

const HEIGHT = 768;
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
    objPendulum: {},
    refreshSvg,
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
    const params = {
      x0: eig.DenseMatrix.fromArray([Math.PI, 0, 0, 0]),
      u0: eig.DenseMatrix.fromArray([0])
    };
    this.system = new Acrobot(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
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

    // Create first pole
    const r1 = two.makeRectangle(
      0,
      this.length / 2,
      this.thickness,
      this.length + this.thickness
    );
    r1.fill = COLOR;
    r1.linewidth = 2;
    // Create second pole
    const r2 = two.makeRectangle(
      0,
      this.length / 2,
      this.thickness,
      this.length + this.thickness
    );
    r2.fill = COLOR;
    r2.linewidth = 2;
    const circle = two.makeCircle(0, this.length, this.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;
    console.log("SVG", this.$refs.svgDiv.childNodes);
    // const torque = two.interpret(this.$refs.svg);
    // console.log("TORQUE", torque);
    const p2 = two.makeGroup(r2, circle);
    p2.translation.set(0, this.length);
    // Assemble poles
    const p1 = two.makeGroup(r1, p2);
    this.objPendulum = {
      p1,
      p2
    };

    this.objPendulum.p1.translation.set(this.width / 2, HEIGHT / 2);
    // two.update();
    two.bind("update", this.update).play();

    // Handle touch events
    const canvas = this.$refs.canvas;
    document.addEventListener("mouseup", ev => {
      this.system.target = null;
    });
    canvas.addEventListener("mousedown", ev => {
      this.system.target = {
        x: ev.offsetX - this.width / 2,
        y: ev.offsetY - HEIGHT / 2
      };
    });
    canvas.addEventListener("mousemove", ev => {
      if (this.system.target) {
        this.system.target = {
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
      // const u = eig.DenseMatrix.fromArray([5]);
      const u = this.controller.getCommand();
      this.system.step(u, dt);
      this.objPendulum.p1.rotation = -this.system.x.vGet(0);
      this.objPendulum.p2.rotation = -this.system.x.vGet(1);
      // this.objPendulum.rotation += 0.1;
      this.objPendulum.p1.translation.set(this.width / 2, HEIGHT / 2);
      this.updateTime = Date.now();
      // Run GC
      eig.GC.flush();
      // const b = Date.now();
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