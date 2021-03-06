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
    ValueIterationPlugin(ref='plugin'
                         :system='system')
  template(v-if='mounted'
           v-slot:sheet)
    ValueIterationPlot(
      :valueIterationPlanner='$refs.plugin.viPlanner'
      :trajectory='$refs.plugin.trajectory'
      @onclick='onclick')
  template(v-slot:bar)
    v-btn(text dark
          @click='reset') reset
</template>

<script>
import eig from "@eigen";
import ModelLayout from "@/components/models/ModelLayout.vue";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import ValueIterationPlot from "@/components/plots/ValueIterationPlot.vue";
import ValueIterationPlugin from "@/components/environments/ValueIteration/ValueIterationPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "valueIteration",

  meta: {
    title: "Value iteration",
    icon: "mdi-restore",
    systems: [Systems.simplePendulum]
  },

  components: {
    ModelLayout,
    ValueIterationPlot,
    ValueIterationPlugin
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
    },

    update() {
      systemMixin.methods.update.call(this);
      // systemMixin.update();
      // console.log('update called')
    },

    onclick(pt) {
      console.log('onclick', pt)
      this.$refs.plugin.simulate(
        new eig.Matrix(pt)
      );
    }
  }
};
</script>

<style>
</style>