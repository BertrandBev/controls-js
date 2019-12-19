<template lang='pug'>
v-row(ref='container'
      justify='center')
  v-row(justify='center')
    v-btn(@click='optimize') optimize
    v-btn.ml-2(@click='download') download
  div.canvas(ref='canvas')
  div(ref='plot')
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import { SecondOrder, traj } from "@/components/secondOrder.js";
import { LQR } from "@/components/controls.js";
import worldMixin from "@/components/worldMixin.js";
import { test } from "@/components/directCollocation.js";
import { Interpolator } from "@/components/utils.js";
import { DirectCollocation } from "@/components/directCollocation.js";

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const COLOR_RED = "#F44336";

const GEOM = {
  cartWidth: 96,
  cartHeight: 48
};

export default {
  name: "SecondOrder",

  mixins: [worldMixin],

  data: () => ({
    // Graphics
    graphics: {},
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
      x0: eig.Matrix.fromArray([0, 0]),
      u0: eig.Matrix.fromArray([0])
    };
    this.system = new SecondOrder(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
    this.interpolator = new Interpolator(true);
    this.interpolator.set(traj.x.map(eig.Matrix.fromArray), traj.dt);
  },

  mounted() {
    // Cart
    const cart = this.two.makeRectangle(0, 0, GEOM.cartWidth, GEOM.cartHeight);
    cart.fill = COLOR_DARK;
    cart.linewidth = 2;

    // Forces
    const sides = [-GEOM.cartWidth / 2, GEOM.cartWidth / 2].map(x => {
      const fLine = this.two.makeLine(x, 0, x, 0);
      fLine.linewidth = 2;
      fLine.stroke = COLOR_RED;
      const fHead = this.two.makePolygon(0, 0, 6, 3);
      fHead.rotation = (Math.PI / 2) * Math.sign(x);
      fHead.fill = COLOR_RED;
      return { group: this.two.makeGroup(fLine, fHead), fLine, fHead };
    });
    this.graphics.showControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(0) * 5, -100, 100);
        side.group.visible = (idx - 0.5) * uh > 0;
        side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
        side.fLine.vertices[1].x = side.fHead.translation.x;
      });
    };
    this.graphics.cart = this.two.makeGroup(
      cart,
      sides[0].group,
      sides[1].group
    );

    this.two.bind("update", this.update).play();
  },

  methods: {
    optimize() {
      const xStart = eig.Matrix.fromArray([-2, 0]);
      const xEnd = eig.Matrix.fromArray([2, 0]);
      const uMax = 5;
      const nPoints = 30;
      const anchors = [
        { t: 0, x: xStart },
        { t: 0.5, x: xEnd },
        { t: 1, x: xStart }
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
      const [x, t] = collocation.optimize();
      this.interpolator.set(x, t / x.length);
    },

    download() {
      this.interpolator.print();
    },

    update() {
      // TODO: add FPS meter
      let u = new eig.Matrix(1, 1);
      if (this.mode == "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
        // const u = this.controller.getCommand();
        this.system.step(u, dt, this.mouseTarget);
      } else if (this.interpolator.ready()) {
        const x = this.interpolator.get(Date.now() / 1000);
        this.system.x.vSet(0, x.vGet(0));
        this.system.x.vSet(1, x.vGet(1));
        u = x.block(2, 0, 1, 1);
      }
      // Graphic update
      const x = this.system.x;
      this.graphics.cart.translation.set(...this.worldToCanvas([x.vGet(0), 0]));
      this.graphics.showControl(u);
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