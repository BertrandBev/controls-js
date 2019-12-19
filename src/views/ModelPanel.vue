<template lang="pug">
div(:style='containerStyle')
  //- div.blue(style='width: 32px; height: 32px')
  div.blue(ref='sheet'
          :style='sheetStyle')
    //- Bottom toolbar
    div.bottomBar
      v-spacer
      v-btn(dark
            text
            @click='showPlot = !showPlot')
        v-icon.mr-1(dark) {{ showPlot ? "mdi-chevron-up" : "mdi-chevron-down" }}
        | {{ showPlot ? "open" : "close" }}

</template>

<script>
import anime from "animejs";

export default {
  components: {},

  data: () => ({
    showPlot: true
  }),

  watch: {
    showPlot() {
      anime({
        targets: this.$refs.sheet,
        translateY: this.showPlot ? 300 : 0,
        easing: "easeInOutCubic",
        duration: 300
      });
      // if (this.toggle) {

      // }
    }
  },

  computed: {
    sheetStyle() {
      return {
        width: `${this.$store.windowSize.x}px`,
        height: `300px`,
        position: "absolute",
        bottom: `0px`,
        transform: "translateY(300px)"
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

  mounted() {},

  methods: {}
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
}
</style>