<template lang="pug">
v-navigation-drawer(v-model='drawer'
                    app clipped)
  v-list(dense)
    //* Header
    v-list-item
      v-list-item-icon
        v-icon mdi-home
      v-list-item-title Home
    //* Groups test
    v-list-group(prepend-icon='mdi-alpha')
      template(v-slot:activator)
        v-list-item-title LQR
      v-list-item(@click='() => navLQR("secondOrder")')
        v-list-item-title Second order
        v-list-item-icon
          v-icon mdi-alpha
      v-list-item(@click='() => navLQR("simplePendulum")')
        v-list-item-title Simple pendulum
        v-list-item-icon
          v-icon mdi-beta
      v-list-item(@click='() => navLQR("doublePendulum")')
        v-list-item-title Double pendulum
        v-list-item-icon
          v-icon mdi-gamma
      
    
    //* Routes
    div(v-for='routes, name in groups'
        :key='`group_${name}`')
      v-list-item
        v-list-item-content
          v-list-item-subtitle {{ name }}
      v-list-item(v-for='item, idx in routes'
                  :key='`item_${idx}`'
                  @click='nav(item.name)'
                  :class='{ active: isActive(item.name) }')
        v-list-item-action
          v-icon {{ item.icon }}
        v-list-item-content
          v-list-item-title {{ item.title }}
</template>

<script>
import { routes } from "@/router/router.js";
import _ from "lodash";

export default {
  data: () => ({
    drawer: null
  }),

  props: {
    value: Boolean
  },

  computed: {
    groups() {
      const groups = {};
      routes
        .filter(el => !!el.group)
        .forEach(route => {
          if (!_.has(groups, route.group)) groups[route.group] = [];
          groups[route.group].push(route);
        });
      return groups;
    }
  },

  mounted() {
    this.$nextTick(() => {
      // this.drawer = this.$store.windowSize.x > 1264;
    });
  },

  methods: {
    toggle() {
      this.drawer = !this.drawer;
    },

    github() {
      window.open("https://github.com/BertrandBev/nl-controls", "_blank");
    },

    isActive(name) {
      return this.$route.name === name;
    },

    nav(name) {
      this.$router.push({ name });
    },

    navLQR(systemName) {
      this.$router.push({ name: "lqr", params: { systemName } });
    }
  }
};
</script>

<style scoped>
.active {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>