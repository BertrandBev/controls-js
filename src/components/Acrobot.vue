<template lang='pug'>
v-row(ref='container'
      justify='center')
  div.canvas(ref='canvas')
</template>

<script>
import worldMixin from "@/components/worldMixin.js";
import { Acrobot } from "@/components/acrobot.js";
import LQR from "@/components/controllers/LQR.js";
import _ from "lodash";
import eig from "@eigen";

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
    graphics: {},
    // State
    controller: null,
    updateTime: Date.now()
  }),

  computed: {
    scale() {
      return GEOM.length / this.system.params.l;
    }
  },

  created() {
    const params = {
      x0: eig.Matrix.fromArray([Math.PI, 0, 0, 0]),
      u0: eig.Matrix.fromArray([0])
    };
    this.system = new Acrobot(params);
    this.controller = new LQR(this.system, params.x0, params.u0);
  },

  mounted() {
    // Create first pole
    const r1 = this.two.makeRectangle(
      0,
      this.length / 2,
      this.thickness,
      this.length + this.thickness
    );
    r1.fill = COLOR;
    r1.linewidth = 2;
    // Create second pole
    const r2 = this.two.makeRectangle(
      0,
      this.length / 2,
      this.thickness,
      this.length + this.thickness
    );
    r2.fill = COLOR;
    r2.linewidth = 2;
    const circle = this.two.makeCircle(0, this.length, this.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;

    const p2 = this.two.makeGroup(r2, circle);
    p2.translation.set(0, this.length);
    // Assemble poles
    const p1 = this.two.makeGroup(r1, p2);
    this.graphics = {
      p1,
      p2
    };

    this.two.bind("update", this.update).play();
  },

  methods: {
    update() {
      const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
      const a = Date.now();
      const u = this.controller.getCommand();
      this.system.step(u, dt);
      // Update graphics
      const x = this.system.x;
      this.graphics.p1.rotation = -x.vGet(0);
      this.graphics.p2.rotation = -x.vGet(2);
      this.graphics.p1.translation.set(...this.worldToCanvas([0, 0]));
      this.updateTime = Date.now();
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>