<template lang="pug">
div(style='display: flex; flex-direction: column')
  span.font-weight-light.mt-2 Blocks
  div.mb-3.mt-2(v-for='block, idx in blocks'
           :key='`block_${block.key || idx}`'
           style='display: flex; align-items: center')
    span.font-weight-light {{ idx }} -
    ValueInput.ml-2(:ref='`time_${idx}`'
                    :value.sync='block.size'
                    label='size')
    //- style='flex: 0 0 auto; width: 48px'
    v-btn(icon
          color='red'
          @click='deleteBlock(idx)')
      v-icon mdi-delete
  v-btn(@click='addBlock'
        outlined
        color='green') + add
</template>

<script>
import anime from "animejs";
import { setDraggable } from "@/components/twoUtils.js";
import colors from "vuetify/lib/util/colors";
// import MatrixInput from "./MatrixInput.vue";
// import ArrayInput from "./ArrayInput.vue";
import ValueInput from "./ValueInput.vue";
import _ from "lodash";

export default {
  components: {
    ValueInput
  },

  data: () => ({
    two: null,
    blocks: []
  }),

  props: {
    initBlocks: Array
  },

  computed: {
    blockDragged() {
      return _.some(this.blocks.map(s => s.dragged));
    }
  },

  created() {
    this.reset();
  },

  methods: {
    reset() {
      // [...Array(this.blocks.length)].forEach(() => this.deleteBlock(0));
      this.blocks.forEach(s => {
        s.tPrev = 0;
      });
    },

    createGraphics(two) {
      this.two = two;
      // Create handles
      this.blocks = _.cloneDeep(this.initBlocks);
      this.blocks.forEach(block => this.createBlock(block));
      this.labelBlocks();
      this.reset();
    },

    addBlock() {
      // if (this.blocks.length === 0) return;
      const block = { pos: [0, 0], size: 32 };
      this.createBlock(block);
      this.blocks.push(block);
      this.labelBlocks();
    },

    deleteBlock(idx) {
      this.two.remove(this.blocks[idx].graphics);
      this.blocks.splice(idx, 1);
      this.labelBlocks();
    },

    createBlock(block) {
      const size = block.size;
      const radius = 4;
      const square = this.two.makeRoundedRectangle(0, 0, size, size, radius);
      const text = this.two.makeText("", 0, 1.5);
      text.size = 14;
      text.weight = "bolder";
      text.fill = "#ffffff";
      square.linewidth = 3;
      square.stroke = colors.blueGrey.darken4;
      square.fill = colors.blueGrey.base;
      const group = this.two.makeGroup(square, text);
      const pos = this.two.worldToCanvas(block.pos);
      group.translation.set(...pos);
      block.graphics = group;
      block.text = text;
      this.two.update();
      const params = {
        scale: 1.1,
        mousedown: () => {
          this.$set(block, "dragged", true);
        },
        mouseup: () => {
          this.$set(block, "dragged", false);
        },
        mousemove: pos => {
          block.pos = this.two.canvasToWorld(pos);
        }
      };
      this.$nextTick(() => {
        setDraggable(group, params);
      });
    },

    labelBlocks() {
      this.blocks.forEach((block, idx) => {
        block.text.value = `${idx}`;
      });
    },

    update(t) {}
  }
};
</script>