<template lang='pug'>
v-app(v-resize="onResize")
  Drawer(ref='drawer')
  Toolbar(@toggleDrawer='toggleDrawer')
  v-content
    //* Loading row
    v-row(v-if='loading'
          align='center'
          justify='center'
          style='height: 100%')
      v-progress-circular(:size='40'
                          color='blue'
                          indeterminate)
    //* Content
    router-view(v-else)
  //* Notifications
  notifications(group='alert'
                position='bottom center'
                width='400px'
                closeOnClick
                :max='3'
                classes='notification-style')
</template>

<script>
import eig from "@eigen";
import Toolbar from "@/components/nav/Toolbar.vue";
import Drawer from "@/components/nav/Drawer.vue";

export default {
  name: "App",

  components: {
    Toolbar,
    Drawer
  },

  data: () => ({
    loading: true // TEMP
  }),

  created() {
    eig.ready.then(() => {
      this.loading = false;
    });
  },

  mounted() {
    this.onResize();
  },

  methods: {
    onResize() {
      this.$store.windowSize.x =
        window.innerWidth -
        this.$vuetify.application.left -
        this.$vuetify.application.right;
      this.$store.windowSize.y =
        window.innerHeight - this.$vuetify.application.top;
    },

    toggleDrawer() {
      this.$refs.drawer.toggle();
    }
  }
};
</script>

<style lang="scss">
.notification-style {
  padding: 10px;
  margin: 0 5px 5px;
  font-size: 16px;
  color: white;
  border-left: 5px solid #187fe7;
  &.type-info {
    background: #44a4fc;
    border-left-color: #187fe7;
  }
  &.type-warn {
    background: #ffb648;
    border-left-color: #f48a06;
  }
  &.type-error {
    background: #d32f2f;
    border-left-color: #b71c1c;
  }
  &.type-success {
    background: #68cd86;
    border-left-color: #42a85f;
  }
}
</style>