<template lang="pug">
v-navigation-drawer(v-model='drawer'
                    app clipped)
  v-list(dense)
    //* Header
    v-list-item(@click='navHome')
      v-list-item-icon
        v-icon mdi-home
      v-list-item-title Home
    v-divider
    //* Environments
    v-list-group(v-for='route, idx in envRoutes'
                 :key='`env_${idx}`'
                 :prepend-icon='route.meta.icon'
                 :value='isEnv(route.name)')
      template(v-slot:activator)
        v-list-item-title {{ route.meta.title }}
      v-list-item.ml-3(v-for='system, sidx, in route.meta.systems'
                  :key='`env_${idx}_system_${sidx}`'
                  :class='{ active: isActive(route, system) }'
                  @click='() => navSystem(route, system)')
        v-list-item-title {{ system.NAME }}
        v-list-item-icon
          v-icon {{ icons[sidx] }}
  //* Footer
  v-divider
  v-list(dense style='flex: 0 0 auto')
    v-list-item(@click='github')
      v-list-item-action
        v-icon mdi-github
      v-list-item-content
        v-list-item-title Github
</template>

<script>
import { envRoutes } from "@/router/router.js";
import _ from "lodash";

const icons = [
  "mdi-alpha",
  "mdi-beta",
  "mdi-gamma",
  "mdi-delta",
  "mdi-epsilon"
];

export default {
  data: () => ({
    drawer: null,
    envRoutes,
    icons
  }),

  props: {
    value: Boolean
  },

  computed: {},

  mounted() {
    this.$nextTick(() => {
      // this.drawer = this.$store.windowSize.x > 1264;
    });
  },

  methods: {
    navHome() {
      this.$router.push({ path: '/' });
    },

    toggle() {
      this.drawer = !this.drawer;
    },

    github() {
      window.open("https://github.com/BertrandBev/controls-js", "_blank");
    },

    isEnv(env) {
      return this.$route.name === env;
    },

    isActive(route, system) {
      return (
        this.isEnv(route.name) && this.$route.params.systemName === system.TAG
      );
    },

    navSystem(route, system) {
      if (this.isActive(route, system)) return;
      this.$router.push({
        name: route.name,
        params: { systemName: system.TAG }
      });
    }
  }
};
</script>

<style scoped>
.active {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>