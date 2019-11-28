<template lang='pug'>
v-row(ref='container'
      justify='center')
  div.canvas(ref='canvas')
</template>

<script>
import { Quadrotor2D } from "@/components/quadrotor2D.js";
import { LQR } from "@/components/controls.js";
import worldMixin from "@/components/worldMixin.js";
import _ from "lodash";
import Hammer from "hammerjs";
const eig = require("../../lib/eigen-js/eigen.js");
import { InteractivePath } from "@/components/interactivePath.js";
import { Interpolator } from "./utils.js";

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const FRAME_COLOR = "#455A64";
const COLOR_RED = "#F44336";

const GEOM = {
  thickness: 8,
  length: 128
};

export default {
  name: "Quadrotor2D",

  mixins: [worldMixin],

  data: () => ({
    // Graphics
    graphics: {},
    // Mode
    mode: "Flatness",
    rollout: null,
    // State
    system: null,
    controller: null,
    updateTime: Date.now()
  }),

  computed: {
    scale() {
      return GEOM.length / this.system.params.l;
    }
  },

  watch: {},

  created() {
    const params = {
      x0: new eig.DenseMatrix(6, 1)
    };
    this.system = new Quadrotor2D(params);
    params.u0 = this.system.ssCommand();
    this.controller = new LQR(this.system, params.x0, params.u0);
  },

  mounted() {
    // Create body
    const body = this.two.makeRectangle(0, 0, GEOM.length, GEOM.thickness);
    body.fill = COLOR;
    body.linewidth = 2;

    // Create propellers
    const propHeight = -1.5 * GEOM.thickness;
    const propLength = GEOM.length / 4;
    this.graphics.force = [null, null];
    let sides = [(-3 * GEOM.length) / 7, (3 * GEOM.length) / 7].map(x => {
      const prop = this.two.makeLine(
        x - propLength,
        propHeight,
        x + propLength,
        propHeight
      );
      prop.linewidth = 3;
      prop.fill = COLOR_DARK;
      const shaft = this.two.makeLine(x, -3, x, propHeight);
      shaft.linewidth = 2;
      shaft.fill = COLOR_DARK;
      // Motors?

      // Forces
      const fLine = this.two.makeLine(x, propHeight, x, propHeight - 10);
      fLine.linewidth = 2;
      fLine.stroke = COLOR_RED;
      const fHead = this.two.makePolygon(x, propHeight - 10, 6, 3);
      fHead.fill = COLOR_RED;

      return {
        prop: this.two.makeGroup(prop, shaft, fLine, fHead),
        fLine,
        fHead
      };
    });
    this.graphics.showControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(idx) * 5, -100, 100);
        side.fHead.translation.y = propHeight - uh;
        side.fHead.rotation = uh > 0 ? 0 : Math.PI;
        side.fLine.vertices[1].y = side.fHead.translation.y;
      });
    };
    this.graphics.system = this.two.makeGroup(
      body,
      sides[0].prop,
      sides[1].prop
    );

    // Setup path
    this.interpolator = new Interpolator(true);
    this.path = new InteractivePath(this.two);
    this.path.group.translation.set(this.width / 2, this.height / 2);
    // Update path
    this.updatePathDebounced = _.debounce(this.updatePath, 1000);
    this.path.addUpdateListener(() => {
      this.updatePathDebounced();
    });
    this.updatePathDebounced();

    // Start animation
    this.two.bind("update", this.update).play();
  },

  methods: {
    updatePath() {
      // On path update
      const travelTime = 5;
      const dt = 1 / 60;
      const xy = this.path.discretize(travelTime / dt).map(val => {
        const pathPos = [val.x + this.width / 2, val.y + this.height / 2];
        return eig.DenseMatrix.fromArray(this.canvasToWorld(pathPos));
      });
      const x = this.system.fitTrajectory(xy, dt);
      // Init rollout
      this.interpolator.set(x, dt);
    },

    update() {
      // TODO: add FPS meter
      let u = this.system.ssCommand();
      if (this.mode === "Flatness" && this.interpolator.ready()) {
        // Flatness mode
        const x = this.interpolator.get(Date.now() / 1000);
        this.system.x.vSet(0, x.vGet(0));
        this.system.x.vSet(1, x.vGet(1));
        this.system.x.vSet(2, x.vGet(2));
        u = x.block(6, 0, 2, 1);
      } else {
        // TODO: hook to mode selector
        const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
        u = this.controller.getCommand();
        const target = this.mouseTarget
          ? this.canvasToWorld(this.mouseTarget)
          : null;
        this.system.step(u, dt, target);
      }
      // Graphic update
      const x = this.system.x;
      this.graphics.system.rotation = -x.vGet(2);
      this.graphics.system.translation.set(
        ...this.worldToCanvas([x.vGet(0), x.vGet(1)])
      );
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