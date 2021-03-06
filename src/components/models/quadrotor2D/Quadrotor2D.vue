<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    PluginGroup(ref='pluginGroup'
                LQRPlugin
                DirectCollocationPlugin
                FlatnessPlugin
                :system='system'
                :interactivePath='interactivePath')
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
import Quadrotor2D, { traj } from "./quadrotor2D.js";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import InteractivePath from "@/components/planners/interactivePath.js";
import PluginGroup from "@/components/plugins/PluginGroup.vue";
import PlotSheet from "@/components/models/PlotSheet.vue";
import ControlBar from "@/components/models/ControlBar.vue";

export default {
  name: "DoublePendulum",

  components: {
    ModelLayout,
    PluginGroup,
    PlotSheet,
    ControlBar
  },

  mixins: [worldMixin, systemMixin],

  data: () => ({
    interactivePath: null
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return 128;
    },

    dt() {
      return 1 / 60;
    },

    mouseTargetEnabled() {
      return _.get(this.pluginGroup, "active.name") !== "FlatnessPlugin";
    }
  },

  created() {
    this.system = new Quadrotor2D();
  },

  mounted() {
    this.pluginGroup = this.$refs.pluginGroup;
    // Create interactive path
    this.interactivePath = new InteractivePath(
      this.two,
      this.worldToCanvas,
      this.canvasToWorld
    );
    // Create graphics
    this.createGraphics();
  },

  methods: {
    reset() {
      worldMixin.methods.reset.call(this);
      systemMixin.methods.reset.call(this);
    }
  }
};
</script>

<style>
</style>