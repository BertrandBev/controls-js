<template lang="pug">
div(style='display: flex; align-items: center; overflow: hide')
  v-select(v-model='selected'
           style='max-width: 120px'
           :items="pluginNames"
           label='plugin'
           filled dark dense solo
           hide-details)
</template>

<script>
import _ from "lodash";

export default {
  data: () => ({
    selected: null
  }),

  props: {
    plugins: Array,
    active: Object
  },

  watch: {
    active() {
      this.selected = this.active ? this.active.name : null;
    },

    selected() {
      const plugin = this.plugins.find(p => p.name === this.selected);
      this.$emit("update:active", plugin);
    }
  },

  computed: {
    pluginNames() {
      console.log("plugins", this.plugins);
      return this.plugins.map(plugin => plugin.name);
    }
  }
};
</script>