<template lang='pug'>
ModelLayout
  template(v-slot:canvas)
    div.canvas(ref='canvas')
  template(v-slot:overlay)
    span.ma-2 fps: {{ fps.toFixed(0) }}
  template(v-slot:drawer)
    RRTPlugin(ref='plugin'
              :system='system'
              @activate='() => {}')
  //- template(v-if='mounted'
  //-          v-slot:sheet)
  //-   TrajPlot(:trajectories='$refs.plugin.trajectories')
  template(v-slot:bar)
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import ModelLayout from "@/components/models/ModelLayout.vue";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import TrajPlot from "@/components/plots/TrajPlot.vue";
import RRTPlugin from "@/components/environments/RRT/RRTPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "rrt",

  meta: {
    title: "RRT",
    icon: "mdi-robot-industrial",
    systems: [Systems.arm]
  },

  components: {
    ModelLayout,
    TrajPlot,
    RRTPlugin
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