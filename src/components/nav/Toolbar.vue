<template lang="pug">
v-app-bar(app clipped-left clipped-right
          :color='color'
          :dark='dark'
          dense)
  //* Left action
  v-app-bar-nav-icon(v-if='!showBack'
                     @click.stop="$emit('toggleDrawer')")
  v-toolbar-items(v-else
                  style='margin-left: 0px')
    v-btn.mr-2(icon @click='navBack')
      v-icon(small) fas fa-chevron-left
  //* Content
  v-toolbar-title.headline
    span.font-weight-light {{ title }}
  v-spacer
  v-toolbar-items
    v-btn(href='https://github.com/BertrandBev/eigen-js', target='_blank', text)
      span.mr-2 Github
      v-icon mdi-open-in-new
  //* Right action
  v-btn(v-if='showRightDrawer'
        icon
        dark
        @click.stop="$bus.$emit('toggleDrawer')")
    v-icon mdi-tune
</template>

<script>
import _ from "lodash";
import { routes } from "@/router/router.js";
import Systems from "@/components/models/systems.js";

export default {
  props: {},

  computed: {
    route() {
      return _.find(routes, r => r.name === this.routeName);
    },

    title() {
      const routeName = this.$route.name;
      const routeTitle = this.$route.title;
      const params = this.$route.params;
      if (params.systemName) {
        // System route
        const systemClass = Systems[params.systemName];
        return `${routeTitle || routeName} - ${systemClass.NAME}`;
      }
      return routeTitle || routeName;
    },

    showBack() {
      return false;
    },

    dark() {
      return true;
    },

    routeName() {
      return _.get(this.$route, "name");
    },

    color() {
      return _.get(
        {
          home: "#004D40"
        },
        this.routeName,
        "primary"
      );
    },

    routeQuery() {
      return _.get(this.$route, "query", {});
    },

    showRightDrawer() {
      return _.get(this.route, "rightDrawer", false);
    }
  },

  created() {},

  methods: {
    navBack() {
      this.$bus.$emit("navBack");
    }
  }
};
</script>