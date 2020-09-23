<template lang="pug">
Section(title='RRT')
  Blocks.mt-2(ref='blocks'
              :initBlocks='initBlocks')
  v-btn.mt-2(@click='runRRT'
      outlined
      color='primary') run RRT
</template>

<script>
import Blocks from "@/components/environments/utils/Blocks.vue";
import Section from "@/components/environments/utils/Section.vue";
import pluginMixin from "@/components/environments/pluginMixin.js";
import MatrixInput from "@/components/environments/utils/MatrixInput.vue";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import RRT from "@/components/planners/rrt.js";
import eig from "@eigen";
import _ from "lodash";

export default {
  name: "RRTPlugin",

  mixins: [pluginMixin],

  components: {
    Section,
    MatrixInput,
    ValueInput,
    Blocks
  },

  props: {
    system: Object
  },

  data: () => ({
    params: {},
    rrt: null
  }),

  computed: {
    blocks() {
      return this.$refs.blocks;
    },

    initBlocks() {
      return [{ pos: [1, 1], size: 32 }];
    }
  },

  created() {
    this.rrt = new RRT(this.system);
  },

  methods: {
    runRRT() {
      this.rrt.run(() => true, 1000);
    },

    createGraphics(two) {
      // Create blocks
      this.blocks.createGraphics(two);
    },

    reset() {
      const { x, u } = this.system.trim();
      this.system.setState(x);
      // this.system.step(u, 0.01);
    },

    ready() {
      return false;
    },

    updateSystem(t, dt) {
      return {};
    }
  }
};
</script>