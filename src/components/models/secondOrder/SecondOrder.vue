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
import systemMixin from "@/components/systemMixin.js";
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

  mixins: [worldMixin, systemMixin],

  data: () => ({}),

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
    this.system = new SecondOrder();
  },

  mounted() {
    this.pluginGroup = this.$refs.pluginGroup;
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