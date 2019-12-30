<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    PluginGroup(ref='pluginGroup'
                LQRPlugin
                ValueIterationPlugin
                DirectCollocationPlugin
                :system='system')
  template(v-slot:sheet)
    PlotSheet(ref='plotSheet'
              :pluginGroup='pluginGroup')
  template(v-slot:bar)
    ControlBar(:pluginGroup='pluginGroup')
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import SecondOrder, { traj } from "./secondOrder.js";
import worldMixin from "@/components/worldMixin.js";
import PluginGroup from "@/components/plugins/PluginGroup.vue";
import PlotSheet from "@/components/models/PlotSheet.vue";
import ControlBar from "@/components/models/ControlBar.vue";

export default {
  name: "SecondOrder",

  components: {
    ModelLayout,
    PluginGroup,
    PlotSheet,
    ControlBar
  },

  mixins: [worldMixin],

  data: () => ({
    pluginGroup: null,
    system: null
  }),

  computed: {
    activePlugin() {
      return _.get(this.pluginGroup, "active");
    },

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
    this.system = new SecondOrder();
  },

  mounted() {
    this.system.createGraphics(this.two, this.scale);
    this.pluginGroup = this.$refs.pluginGroup;
  },

  methods: {
    reset() {
      worldMixin.methods.reset.call(this);
      this.pluginGroup.reset();
    },

    update() {
      // TODO: add FPS meter
      let params = this.system.trim();
      // Update system
      if (this.mouseTarget) {
        this.system.trackMouse(this.mouseTarget, this.dt);
      } else if (this.pluginGroup && this.pluginGroup.ready()) {
        params = this.pluginGroup.update(this.t, this.dt);
      } else {
        this.system.step(params.u, this.dt);
      }
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, params);
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>