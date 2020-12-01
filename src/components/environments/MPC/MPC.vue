<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    div(style='display: flex;')
      v-chip.ma-2(label
            color='red'
            text-color='white') Dynamic
      v-spacer
      span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    MPCPlugin(ref='plugin'
              :system='system'
              :systemRef='systemRef'
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
import MPCPlugin from "@/components/environments/MPC/MPCPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "mpc",

  meta: {
    title: "MPC",
    icon: "mdi-camera-timer",
    systems: [
      Systems.secondOrder,
      Systems.quadrotor2D
    ]
  },

  components: {
    ModelLayout,
    TrajPlot,
    MPCPlugin
  },

  mixins: [worldMixin, systemMixin],

  props: {
    systemName: String
  },

  data: () => ({
    systemRef: null
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
    if (!SysClass)
      throw new Error("Unsupported system", this.systemName);
    this.system = new SysClass();
    this.systemRef = new SysClass();
  },

  mounted() {
    this.systemRef.createGraphics(this.two, this.scale);
  },

  methods: {
    reset() {
      worldMixin.methods.reset.call(this);
      systemMixin.methods.reset.call(this);
    },

    update() {
      systemMixin.methods.update.call(this);
      // Update ref system
      this.systemRef.updateGraphics(this.worldToCanvas, {
        // Set transparency & no controls
        ghost: true
      });
    }
  }
};
</script>

<style>
</style>