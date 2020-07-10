<template lang="pug">
Block(title='RRT')
</template>

<script>
import Block from "@/components/environments/utils/Block.vue";
import pluginMixin from "@/components/environments/pluginMixin.js";
import MatrixInput from "@/components/environments/utils/MatrixInput.vue";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import eig from "@eigen";
import _ from "lodash";

export default {
  name: "RRTPlugin",

  mixins: [pluginMixin],

  components: {
    Block,
    MatrixInput,
    ValueInput
  },

  props: {
    system: Object
  },

  data: () => ({
    params: {}
  }),

  computed: {
  },

  created() {},

  methods: {
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