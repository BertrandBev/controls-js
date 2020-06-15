<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    LQRPlugin(ref='plugin'
              :system='system'
              @activate='() => {}')
  template(v-if='mounted'
           v-slot:sheet)
    TrajPlot(:trajectories='$refs.plugin.trajectories')
  template(v-slot:bar)
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import _ from "lodash";
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import SecondOrder from "@/components/models/secondOrder/secondOrder.js";
import SimplePendulum from "@/components/models/simplePendulum.js";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import TrajPlot from "@/components/plots/TrajPlot.vue";
import LQRPlugin from "@/components/plugins/LQRPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "SecondOrder",

  components: {
    ModelLayout,
    TrajPlot,
    LQRPlugin
  },

  mixins: [worldMixin, systemMixin],

  props: {
    systemName: String
  },

  data: () => ({
    mounted: false // TODO: built-in way?
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
    const SysClass = Systems[this.systemName];
    if (!SysClass) console.error("Unsupported system", this.systemName);
    else this.system = new SysClass();
  },

  mounted() {
    this.createGraphics();
    this.mounted = true;
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