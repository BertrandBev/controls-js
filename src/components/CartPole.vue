<template lang='pug'>
v-row(ref='container'
      justify='center')
  v-btn(@click='optimize') optimize
  div.canvas(ref='canvas')
  div(ref='plot')
</template>

<script>
import { CartPole } from "@/components/cartPole.js";
import { LQR } from "@/components/controls.js";
import worldMixin from "@/components/worldMixin.js";
import { test } from "@/components/directCollocation.js";
import _ from "lodash";
import Hammer from "hammerjs";
const eig = require("../../lib/eigen-js/eigen.js");

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";

const GEOM = {
  thickness: 8,
  radius: 16,
  length: 128,
  cartWidth: 96,
  cartHeight: 48
};

export default {
  name: "CartPole",

  mixins: [worldMixin],

  data: () => ({
    // Graphics
    graphics: null,
    // State
    system: null,
    controller: null,
    updateTime: Date.now(),
    mode: "Controls"
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return GEOM.length / this.system.params.l;
    }
  },

  created() {
    const xTop = eig.DenseMatrix.fromArray([0, Math.PI, 0, 0]);
    const params = {
      x0: eig.DenseMatrix.fromArray([0, 0, 0, 0]), // xTop,
      u0: eig.DenseMatrix.fromArray([0])
    };
    this.system = new CartPole(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
  },

  mounted() {
    // Cart
    const cart = this.two.makeRectangle(0, 0, GEOM.cartWidth, GEOM.cartHeight);
    cart.fill = COLOR_DARK;
    cart.linewidth = 2;

    // Pole
    const shaft = this.two.makeRectangle(
      0,
      GEOM.length / 2,
      GEOM.thickness,
      GEOM.length + GEOM.thickness
    );
    shaft.fill = COLOR;
    shaft.linewidth = 2;
    const circle = this.two.makeCircle(0, GEOM.length, GEOM.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;
    const pole = this.two.makeGroup(shaft, circle);

    this.graphics = {
      cart: this.two.makeGroup(cart, pole),
      pole
    };

    this.two.bind("update", this.update).play();
  },

  methods: {
    optimize() {
      test();
    },

    update() {
      // TODO: add FPS meter
      if (this.mode == "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
        // const u = this.controller.getCommand();
        const u = new eig.DenseMatrix(1, 1);
        this.system.step(u, dt, this.mouseTarget);
      } else {
        // Rollout mode
      }
      // Graphic update
      const x = this.system.x;
      this.graphics.pole.rotation = -x.vGet(1);
      this.graphics.cart.translation.set(...this.worldToCanvas([x.vGet(0), 0]));
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