<template lang='pug'>
div.frame(ref='cont')
  v-btn(@click='optimize') optimize
  div.canvas(ref='canvas'
             style='flex: 0 0 auto')
  TrajPlot(ref='graph'
            style='flex: 1 0 auto'
            :system='system'
            :trajectory='trajectory')
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import { CartPole } from "@/components/cartPole.js";
import LQR from "@/components/controllers/LQR.js";
import worldMixin from "@/components/worldMixin.js";
import { test } from "@/components/directCollocation.js";
import Trajectory from '@/components/planners/trajectory.js'
import { DirectCollocation } from "@/components/directCollocation.js";
import TrajPlot from "@/components/planners/TrajPlot.vue";

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const COLOR_RED = "#F44336";

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

  components: { TrajPlot },

  data: () => ({
    // Graphics
    graphics: {},
    // State
    system: null,
    controller: null,
    updateTime: Date.now(),
    mode: "Interp",
    trajectory: null
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
    const xTop = eig.Matrix.fromArray([0, Math.PI, 0, 0]);
    const params = {
      x0: eig.Matrix.fromArray([0, 0, 0, 0]), // xTop,
      u0: eig.Matrix.fromArray([0])
    };
    this.system = new CartPole(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
    this.trajectory = new Trajectory(true);
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
    this.graphics.setControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(0) * 5, -100, 100);
        side.group.visible = (idx - 0.5) * uh > 0;
        side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
        side.fLine.vertices[1].x = side.fHead.translation.x;
      });
    };
    this.graphics = {
      ...this.graphics,
      cart: this.two.makeGroup(cart, pole, sides[0].group, sides[1].group),
      pole
    };

    this.two.bind("update", this.update).play();

    // TEMP
    console.log("refs", this.$refs);
    this.$refs.graph.plot();
  },

  methods: {
    optimize() {
      const xStart = eig.Matrix.fromArray([0, 0, 0, 0]);
      const xEnd = eig.Matrix.fromArray([0, Math.PI, 0, 0]);
      const uMax = 10;
      const nPoints = 30;
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
      const x = collocation.optimize();
      this.trajectory.set(x, 0.1);
      this.$refs.graph.plot();
    },

    update() {
      // TODO: add FPS meter
      let u = this.system.ssCommand();
      if (this.mode == "Controls" || this.mouseDragging) {
        // TODO: hook to mode selector
        const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
        // const u = this.controller.getCommand();
        u = new eig.Matrix(1, 1);
        this.system.step(u, dt, this.mouseTarget);
      } else if (this.trajectory.ready()) {
        const x = this.trajectory.get(Date.now() / 1000);
        for (let k = 0; k < this.system.shape[0]; k++) {
          this.system.x.vSet(k, x.vGet(k));
        }
        u = x.block(4, 0, 1, 1);
      }
      // Graphic update
      const x = this.system.x;
      this.graphics.pole.rotation = -x.vGet(1);
      this.graphics.cart.translation.set(...this.worldToCanvas([x.vGet(0), 0]));
      this.graphics.setControl(u);
      this.updateTime = Date.now();
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>