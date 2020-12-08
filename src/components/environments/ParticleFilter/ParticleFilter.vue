<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    ParticleFilterPlugin(ref='plugin'
              :system='system'
              @activate='() => {}')
  template(v-if='isMounted'
           v-slot:sheet)
    ParticlePlot(:particleFilter='$refs.plugin.particleFilter')
  template(v-slot:bar)
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import ModelLayout from "@/components/models/ModelLayout.vue";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import TrajPlot from "@/components/plots/TrajPlot.vue";
import ParticlePlot from "@/components/plots/ParticlePlot.vue";
import ParticleFilterPlugin from "@/components/environments/ParticleFilter/ParticleFilterPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "particleFilter",

  meta: {
    title: "Particle Filter",
    icon: "mdi-dots-hexagon",
    systems: [
      Systems.car,
    ]
  },

  components: {
    ModelLayout,
    ParticlePlot,
    ParticleFilterPlugin
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
      return 48;
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