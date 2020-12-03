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
  template(v-if='isMounted'
           v-slot:sheet)
    TrajPlot(:trajectories='$refs.plugin.trajectories')
  template(v-slot:bar)
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import ModelLayout from "@/components/models/ModelLayout.vue";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import TrajPlot from "@/components/plots/TrajPlot.vue";
import LQRPlugin from "@/components/environments/LQR/LQRPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "lqr",

  meta: {
    title: "LQR",
    icon: "mdi-matrix",
    systems: [
      Systems.secondOrder,
      Systems.arm,
      Systems.cartPole,
      Systems.quadrotor2D,
    ]
  },

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