<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    div(style='display: flex;')
      v-chip.ma-2(label
            color='blue'
            text-color='white') Kinematic
      v-spacer
      span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    FlatnessPlugin(ref='plugin'
                   :system='system'
                   :interactivePath='interactivePath' 
                   @activate='() => {}')
  template(v-if='mounted'
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
import FlatnessPlugin from "@/components/environments/Flatness/FlatnessPlugin.vue";
import Systems from "@/components/models/systems.js";
import InteractivePath from "@/components/planners/interactivePath.js";

export default {
  name: "flatness",

  meta: {
    title: "Flatness",
    icon: "mdi-infinity",
    systems: [
      Systems.quadrotor2D,
    ]
  },

  components: {
    ModelLayout,
    TrajPlot,
    FlatnessPlugin
  },

  mixins: [worldMixin, systemMixin],

  props: {
    systemName: String
  },

  data: () => ({
    mounted: false, // TODO: built-in way?
    interactivePath: null
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
    // Create interactive path
    this.interactivePath = new InteractivePath(
      this.two,
      this.worldToCanvas,
      this.canvasToWorld
    );
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