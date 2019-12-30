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
    pluginGroup: Object
  },

  watch: {
    active() {
      this.selected = this.active ? this.active.name : null;
    },

    selected() {
      const plugin = this.pluginGroup.get(this.selected);
      if (plugin) this.pluginGroup.activate(plugin);
    }
  },

  computed: {
    active() {
      return _.get(this.pluginGroup, "active");
    },

    pluginNames() {
      const plugins = _.get(this.pluginGroup, "plugins", []);
      return plugins.map(plugin => plugin.name);
    }
  }
};
</script>