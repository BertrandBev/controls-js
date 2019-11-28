<template lang='pug'>
v-row(ref='container'
      justify='center')
  v-btn(@click='optimize') optimize
  div.canvas(ref='canvas')
  div(ref='plot')
</template>

<script>
import _ from "lodash";
const eig = require("../../lib/eigen-js/eigen.js");
import { SecondOrder } from "@/components/secondOrder.js";
import { LQR } from "@/components/controls.js";
import worldMixin from "@/components/worldMixin.js";
import { test } from "@/components/directCollocation.js";
import { Interpolator } from "@/components/utils.js";
import { DirectCollocation } from "@/components/directCollocation.js";

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";

const GEOM = {
  cartWidth: 96,
  cartHeight: 48
};

export default {
  name: "SecondOrder",

  mixins: [worldMixin],

  data: () => ({
    // Graphics
    graphics: null,
    // State
    system: null,
    controller: null,
    updateTime: Date.now(),
    mode: "Interp",
    interpolator: null
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return GEOM.cartWidth;
    }
  },

  created() {
    const params = {
      x0: eig.DenseMatrix.fromArray([0, 0]),
      u0: eig.DenseMatrix.fromArray([0])
    };
    this.system = new SecondOrder(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
    this.interpolator = new Interpolator(true);
  },

  mounted() {
    // Cart
    const cart = this.two.makeRectangle(0, 0, GEOM.cartWidth, GEOM.cartHeight);
    cart.fill = COLOR_DARK;
    cart.linewidth = 2;

    this.graphics = {
      cart
    };

    this.two.bind("update", this.update).play();
  },

  methods: {
    optimize() {
      const xStart = eig.DenseMatrix.fromArray([-2, 0]);
      const xEnd = eig.DenseMatrix.fromArray([2, 0]);
      const uMax = 1;
      const nPoints = 30;
      const anchors = [
        { t: 0, x: xStart },
        { t: 0.5, x: xEnd },
        { t: 1, x: xStart }
      ];

      const collocation = new DirectCollocation(
        this.system,
        nPoints,
        uMax,
        anchors
      );
      const x = collocation.optimize();
      this.interpolator.set(x, Date.now() / 1000, 0.1);
    },

    update() {
      // TODO: add FPS meter
      if (this.mode == "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
        // const u = this.controller.getCommand();
        const u = new eig.DenseMatrix(1, 1);
        this.system.step(u, dt, this.mouseTarget);
      } else if (this.interpolator.ready()) {
        const x = this.interpolator.get(Date.now() / 1000);
        this.system.x.vSet(0, x.vGet(0));
        this.system.x.vSet(1, x.vGet(1));
        const u = x.block(2, 0, 1, 1);
      }
      // Graphic update
      const x = this.system.x;
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