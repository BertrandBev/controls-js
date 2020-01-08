<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(style='position: absolute'
               ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    PluginGroup(ref='pluginGroup'
                :system='system'
                KalmanFilterPlugin)
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
import Car, { traj } from "./car.js";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import PluginGroup from "@/components/plugins/PluginGroup.vue";
import PlotSheet from "@/components/models/PlotSheet.vue";
import ControlBar from "@/components/models/ControlBar.vue";

export default {
  name: "Car",

  components: {
    ModelLayout,
    PluginGroup,
    PlotSheet,
    ControlBar
  },

  mixins: [worldMixin, systemMixin],

  data: () => ({}),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return 48;
    },

    dt() {
      return 1 / 60;
    },

    mouseTargetEnabled() {
      return this.pluginGroup.mouseTargetEnabled;
    }
  },

  created() {
    this.system = new Car();
  },

  mounted() {
    this.pluginGroup = this.$refs.pluginGroup;
    this.createGraphics();
    this.pluginGroup.createGraphics(this.two);
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