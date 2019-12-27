<template lang="pug">
Block(title='Direct Collocation')
  v-text-field.mb-3(v-model.number='nPts'
                    label='Point count'
                    outlined
                    dense
                    hide-details)
  div.mb-3(style='display: flex; align-items: center')
    v-text-field(style='flex: 1 0 auto; width: 0px'
                 v-model='uBounds.min'
                 label='uMax'
                 outlined
                 dense
                 hide-details)
    v-text-field.ml-3(style='flex: 1 0 auto; width: 0px'
                      v-model='uBounds.max'
                      label='uMin'
                      outlined
                      dense
                      hide-details)
  div.mb-3(v-for='anchor, idx in anchors'
      :key='`anchor_${idx}`'
      style='display: flex; align-items: center')
    v-text-field(style='flex: 0 0 auto; width: 48px'
                 v-model.number='anchor.t'
                 label='t'
                 outlined
                 dense
                 hide-details)
    v-text-field.ml-3(style='flex: 1 0 auto; width: 0px'
                      v-model='anchor.x'
                      label='x'
                      outlined
                      dense
                      hide-details)
    v-btn(icon
          color='red'
          @click='deleteAnchor(idx)')
      v-icon mdi-delete
  v-btn(@click='addAnchor'
        outlined
        color='green') + add
  v-btn.mt-2(@click='update'
             outlined
             :disabled='running'
             :loading='running'
             color='primary') run collocation
</template>

<script>
import DirectCollocation from "@/components/planners/directCollocation.js";
import Trajectory from "@/components/planners/trajectory.js";
import Block from "./Block.vue";
import eig from "@eigen";
import _ from "lodash";

export default {
  components: {
    Block
  },

  props: {
    system: Object
  },

  data: () => ({
    collocation: null,
    running: false,
    simTraj: null,
    // Parameters
    nPts: 0,
    anchors: [],
    uBounds: { min: [], max: [] }
  }),

  computed: {
    params() {
      return this.system.directCollocationParams();
    }
  },

  created() {
    this.nPts = this.params.nPts;
    this.uBounds = {
      min: `${this.params.uBounds.min}`,
      max: `${this.params.uBounds.max}`
    };
    this.anchors = this.params.anchors.map(anchor => ({
      ...anchor,
      x: `${anchor.x}`
    }));
    this.collocation = new DirectCollocation(this.system);
    this.simTraj = new Trajectory(this.system, false);
  },

  methods: {
    parseArr(str) {
      return str.split(",").map(i => parseFloat(i));
    },

    addAnchor() {
      const nx = this.system.shape[0];
      const x0 = [...Array(nx)].map(() => 0).join(", ");
      this.anchors.push({ t: 0, x: x0 });
    },

    deleteAnchor(idx) {
      this.anchors.splice(idx, 1);
    },

    update() {
      // Get from system
      this.running = true;
      setTimeout(() => {
        this.optimize();
        this.running = false;
      }, 25);
    },

    optimize() {
      // Parse parameters
      const [nx, nu] = this.system.shape;
      const params = _.cloneDeep(this.params);
      params.nPts = this.nPts;
      params.anchors = _.cloneDeep(this.anchors);
      params.uBounds = _.cloneDeep(this.uBounds);
      try {
        params.anchors.forEach(anchor => {
          anchor.x = this.parseArr(anchor.x);
          if (anchor.x.length !== nx)
            return this.$bus.notify(
              "error",
              `The state dimension should be ${nx}`
            );
        });
        params.uBounds.min = this.parseArr(params.uBounds.min);
        params.uBounds.max = this.parseArr(params.uBounds.max);
        if (
          params.uBounds.min.length !== nu ||
          params.uBounds.max.length !== nu
        )
          return this.$bus.notify(
            "error",
            `The controls dimension should be ${nu}`
          );
      } catch (e) {
        return this.$bus.notify("error", "The anchors could not be parsed");
      }
      params.nPts = this.nPts;
      this.collocation.setParams(params);
      let [x, dt] = this.collocation.optimize();
      x = this.system.reverse(x);
      this.simTraj.set(x, dt);
    }
  }
};
</script>