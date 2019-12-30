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
</template>

<script>
import LQRPlugin from "@/components/plugins/LQRPlugin.vue";
import ValueIterationPlugin from "@/components/plugins/ValueIterationPlugin.vue";
import DirectCollocationPlugin from "@/components/plugins/DirectCollocationPlugin.vue";
import _ from "lodash";
const ALL_PLUGINS = [
  "LQRPlugin",
  "ValueIterationPlugin",
  "DirectCollocationPlugin"
];

export default {
  components: {
    LQRPlugin,
    ValueIterationPlugin,
    DirectCollocationPlugin
  },

  props: {
    LQRPlugin: Boolean,
    ValueIterationPlugin: Boolean,
    DirectCollocationPlugin: Boolean,
    //
    system: Object
  },

  data: () => ({
    plugins: []
  }),

  computed: {
    active() {
      return _.first(this.plugins.filter(plugin => plugin.active));
    }
  },

  mounted() {
    this.plugins = ALL_PLUGINS.map(name => this.$refs[name]).filter(
      plugin => !!plugin
    );
  },

  methods: {
    reset() {
      return this.active && this.active.reset();
    },

    ready() {
      return this.active && this.active.ready();
    },

    update(t, dt) {
      return this.ready() ? this.active.update(t, dt) : {};
    },

    get(name) {
      return this.plugins.find(plugin => plugin.name === name);
    },

    activate(plugin) {
      this.plugins.forEach(plugin => {
        plugin.active = false;
      });
      plugin.active = true;
    }
  }
};
</script>