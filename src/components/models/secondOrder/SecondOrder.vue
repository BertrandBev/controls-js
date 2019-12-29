<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    LQRPlugin(ref='LQRPlugin'
              :system='system'
              @update='pluginUpdate')
    ValueIterationPlugin(ref='ValueIterationPlugin'
                         :system='system'
                         @update='pluginUpdate')
    DirectCollocationPlugin(ref='DirectCollocationPlugin'
                            :system='system'
                            @update='pluginUpdate')
  template(v-slot:sheet)
    PlotSheet(ref='plotSheet'
              :plugins='plugins',
              :active='active')
  template(v-slot:bar)
    ControlBar(:plugins='plugins'
               :active.sync='active')
    //* TEMP
    v-btn(text dark
          @click='optimize') optimize
    v-btn(text dark
          @click='download') download
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import SecondOrder, { traj } from "./secondOrder.js";
import OpenLoopController from "@/components/controllers/openLoopController.js";
import worldMixin from "@/components/worldMixin.js";
import Trajectory from "@/components/planners/trajectory.js";
import MPC from "@/components/controllers/MPC.js";
// New imports
import LQRPlugin from "@/components/plugins/LQRPlugin.vue";
import ValueIterationPlugin from "@/components/plugins/ValueIterationPlugin.vue";
import DirectCollocationPlugin from "@/components/plugins/DirectCollocationPlugin.vue";
import PlotSheet from "@/components/models/PlotSheet.vue";
import ControlBar from "@/components/models/ControlBar.vue";

export default {
  name: "SecondOrder",

  components: {
    ModelLayout,
    LQRPlugin,
    ValueIterationPlugin,
    DirectCollocationPlugin,
    PlotSheet,
    ControlBar
  },

  mixins: [worldMixin],

  data: () => ({
    // State
    system: null,
    plugins: [],
    active: null, // Active plugin
    mode: "MPC"
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return 96;
    },

    dt() {
      return 1 / 60;
    }
  },

  created() {
    const params = {
      x0: eig.Matrix.fromArray([0, 0]),
      u0: eig.Matrix.fromArray([0])
    };
    this.system = new SecondOrder(params);
  },

  mounted() {
    this.system.createGraphics(this.two, this.scale);
    this.plugins = [
      "LQRPlugin",
      "ValueIterationPlugin",
      "DirectCollocationPlugin"
    ]
      .map(name => this.$refs[name])
      .filter(plugin => !!plugin);
  },

  methods: {
    pluginUpdate(plugin) {
      this.active = plugin;
    },

    reset() {
      worldMixin.methods.reset.call(this);
      if (this.active) this.active.reset();
    },

    plot() {
      this.$refs.trajPlot.update();
    },

    optimize() {},

    download() {
      this.trajectory.print();
    },

    update() {
      // TODO: add FPS meter
      let sim = false;
      let { u } = this.system.trim();
      // Update system
      if (this.mouseTarget) {
        this.system.trackMouse(this.mouseTarget, this.dt);
      } else if (this.active) {
        const uUpdate = this.active.update(this.t, this.dt);
        if (!uUpdate) {
          sim = true;
        } else {
          u = uUpdate;
        }
      }
      if (sim) {
        this.system.step(u, this.dt);
      }
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, u);
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>