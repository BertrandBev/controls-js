<template lang="pug">
div(:style='containerStyle')
  //* Main canvas
  div(ref='canvas'
      :style='canvasStyle')
    slot(name='canvas')
  //* Overlay
  div(:style='overlayStyle')
    slot(name='overlay')
  //* Bottom sheet
  div.blue(ref='sheet'
          :style='sheetStyle')
    //* Bottom toolbar
    div.bottomBar
      slot(name='bar')
      v-spacer
      v-btn(dark
            text
            @click='sheet = !sheet')
        v-icon.mr-1(dark) {{ sheet ? "mdi-chevron-down" : "mdi-chevron-up" }}
        | {{ sheet ? "close" : "open" }}
    //* Plot
    slot(name='sheet')
  //* Nav drawer
  v-navigation-drawer(v-model='drawer'
                      app clipped right
                      width='300px')
    slot(name='drawer')
</template>

<script>
import anime from "animejs";

export default {
  components: {},

  data: () => ({
    sheet: true,
    drawer: null
  }),

  watch: {
    sheet() {
      anime({
        targets: this.$refs.sheet,
        translateY: this.sheet ? 0 : this.sheetHeight,
        easing: "easeInOutCubic",
        duration: 300
      });
      anime({
        targets: this.$refs.canvas,
        translateY: this.sheet ? -this.sheetHeight / 2 : 0,
        easing: "easeInOutCubic",
        duration: 300
      });
    }
  },

  computed: {
    sheetHeight() {
      return this.$store.windowSize.y / 2;
    },

    overlayStyle() {
      return {
        position: "absolute",
        top: "0px",
        left: "0px",
        width: "100%"
      };
    },

    sheetStyle() {
      const translateY = 0; // this.sheet ? 0 : this.sheetHeight;
      return {
        width: `${this.$store.windowSize.x}px`,
        height: `${this.sheetHeight}px`,
        position: "absolute",
        bottom: `0px`,
        transform: `translateY(${translateY}px)`
      };
    },

    canvasStyle() {
      const translateY = -this.sheetHeight / 2; // this.sheet ? -this.sheetHeight / 2 : 0;
      return {
        position: 'relative',
        width: `${this.$store.windowSize.x}px`,
        height: `${this.$store.windowSize.y}px`,
        transform: `translateY(${translateY}px)`,
        background:
          'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAATUlEQVRYR+3VMQoAMAhD0Xq3HNs75QgtdOqsg1C+u5C8JWF7r8ELAiCAAAIIIIBARyAz75BLKg96a47HA5RrP48tAQIggAACCCDwhcABvG5/oRsc6n0AAAAASUVORK5CYII=")',
        // background: 'white',
        center: "center",
        display: "flex",
        "flex-direction": "row",
        "justify-content": "center",
        "align-items": "center"
      };
    },

    containerStyle() {
      return {
        width: `${this.$store.windowSize.x}px`,
        height: `${this.$store.windowSize.y}px`,
        display: "flex",
        "flex-direction": "row",
        "justify-content": "center",
        "align-items": "center",
        background: "#00796B",
        position: "relative",
        overflow: "hidden"
      };
    }
  },

  mounted() {
    this.$bus.$on("toggleDrawer", this.toggleDrawer);
    this.$nextTick(() => {
      // this.drawer = this.$store.windowSize.x > 1264;
    });
  },

  beforeDestroy() {
    this.$bus.$off("toggleDrawer", this.toggleDrawer);
  },

  methods: {
    toggleDrawer() {
      this.drawer = !this.drawer;
    }
  }
};
</script>

<style>
.bottomBar {
  width: 100%;
  height: 38px;
  margin-top: -38px;
  display: flex;
  flex-direction: row;
  background-color: #1875d2;
  overflow: hidden;
}
</style>