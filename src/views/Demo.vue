<template lang='pug'>
div(ref="canvas"
    :style='canvasStyle')
  .canvas(ref="canvas")
  DirectCollocationPlugin(
    v-show="false",
    ref="plugin",
    :system="system",
    @activate="() => {}",
    :disableMouse='true'
  )
</template>

<script>
import ModelLayout from "@/components/models/ModelLayout.vue";
import worldMixin from "@/components/worldMixin.js";
import systemMixin from "@/components/systemMixin.js";
import DirectCollocationPlugin from "@/components/environments/DirectCollocation/DirectCollocationPlugin.vue";
import Systems from "@/components/models/systems.js";

export default {
  name: "demo",

  components: {
    ModelLayout,
    DirectCollocationPlugin,
  },

  mixins: [worldMixin, systemMixin],

  props: {
    systemName: String,
  },

  data: () => ({}),

  created() {
    const SysClass = Systems.cartPole;
    this.system = new SysClass();
  },

  mounted() {},

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return 96;
    },

    dt() {
      return 1 / 60;
    },

    canvasStyle() {
      // const translateY = -this.sheetHeight / 2; // this.sheet ? -this.sheetHeight / 2 : 0;
      return {
        // position: "relative",
        width: `100%`,
        // height: `${this.$store.windowSize.y}px`,
        // transform: `translateY(${translateY}px)`,
        background:
          'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAATUlEQVRYR+3VMQoAMAhD0Xq3HNs75QgtdOqsg1C+u5C8JWF7r8ELAiCAAAIIIIBARyAz75BLKg96a47HA5RrP48tAQIggAACCCDwhcABvG5/oRsc6n0AAAAASUVORK5CYII=")',
        // background: 'white',
        center: "center",
        display: "flex",
        "flex-direction": "row",
        "justify-content": "center",
        "align-items": "center",
      };
    },
  },

  methods: {
    reset() {
      worldMixin.methods.reset.call(this);
      systemMixin.methods.reset.call(this);
    },
  },
};
</script>

<style>
</style>