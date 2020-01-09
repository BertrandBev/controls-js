<template lang="pug">
  div
    LQRPlugin(v-if='LQRPlugin'
              ref='LQRPlugin'
              :system='system'
              @activate='activate')
    ValueIterationPlugin(v-if='ValueIterationPlugin'
                         ref='ValueIterationPlugin'
                         :system='system'
                         @activate='activate')
    DirectCollocationPlugin(v-if='DirectCollocationPlugin'
                            ref='DirectCollocationPlugin'
                            :system='system'
                            @activate='activate')
    FlatnessPlugin(v-if='FlatnessPlugin'
                   ref='FlatnessPlugin'
                   :system='system'
                   :interactivePath='interactivePath'
                   @activate='activate')
    KalmanFilterPlugin(v-if='KalmanFilterPlugin'
                       ref='KalmanFilterPlugin'
                       :system='system'
                       @activate='activate')
    ParticleFilterPlugin(v-if='ParticleFilterPlugin'
                         ref='ParticleFilterPlugin'
                         :system='system'
                         @activate='activate')
</template>

<script>
import LQRPlugin from "@/components/plugins/LQRPlugin.vue";
import ValueIterationPlugin from "@/components/plugins/ValueIterationPlugin.vue";
import DirectCollocationPlugin from "@/components/plugins/DirectCollocationPlugin.vue";
import FlatnessPlugin from "@/components/plugins/FlatnessPlugin.vue";
import KalmanFilterPlugin from "@/components/plugins/KalmanFilterPlugin.vue";
import ParticleFilterPlugin from "@/components/plugins/ParticleFilterPlugin.vue";

import _ from "lodash";
const components = {
  LQRPlugin,
  ValueIterationPlugin,
  DirectCollocationPlugin,
  FlatnessPlugin,
  KalmanFilterPlugin,
  ParticleFilterPlugin
};

export default {
  components,

  props: {
    LQRPlugin: Boolean,
    ValueIterationPlugin: Boolean,
    DirectCollocationPlugin: Boolean,
    FlatnessPlugin: Boolean,
    KalmanFilterPlugin: Boolean,
    ParticleFilterPlugin: Boolean,
    //
    system: Object,
    interactivePath: Object
  },

  data: () => ({
    plugins: []
  }),

  computed: {
    active() {
      return _.first(this.plugins.filter(plugin => plugin.active));
    },

    mouseTargetEnabled() {
      return this.active && this.active.mouseTargetEnabled;
    }
  },

  mounted() {
    this.plugins = _.keys(components)
      .map(name => this.$refs[name])
      .filter(plugin => !!plugin);
    if (this.plugins.length > 0) this.activate(this.plugins[0]);
  },

  methods: {
    createGraphics(two) {
      this.$nextTick(() => {
        this.plugins.forEach(plugin => plugin.createGraphics(two));
      });
    },

    reset() {
      return this.active && this.active.reset();
    },

    ready() {
      return this.active && this.active.ready();
    },

    update(params) {
      if (this.active) this.active.update(params);
    },

    updateSystem(t, dt) {
      return this.ready() ? this.active.updateSystem(t, dt) : {};
    },

    get(name) {
      return this.plugins.find(plugin => plugin.name === name);
    },

    activate(plugin) {
      this.plugins.forEach(plugin => {
        plugin.active = false;
      });
      plugin.active = true;
      this.reset();
    }
  }
};
</script>