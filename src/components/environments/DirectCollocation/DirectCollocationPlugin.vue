<template lang="pug">
Section(title='Direct Collocation')
  ValueInput(ref='nPts'
              :value.sync='params.nPts'
              label='Point count')
  div.mb-3.mt-3(style='display: flex; align-items: center')
    ArrayInput(ref='uMin'
               style='flex: 1 0 auto; width: 0px'
               :array.sync='params.uBounds.min'
               label='uMin')
    ArrayInput.ml-2(ref='uMax'
               style='flex: 1 0 auto; width: 0px'
               :array.sync='params.uBounds.max'
               label='uMax')
  div.mb-3(v-for='anchor, idx in params.anchors'
           :key='`anchor_${anchor.key || idx}`'
           style='display: flex; align-items: center')
    ValueInput(:ref='`time_${idx}`'
               style='flex: 0 0 auto; width: 48px'
               :value.sync='anchor.t'
               label='t')
    ArrayInput.ml-2(:ref='`anchor_${idx}`'
               style='flex: 1 0 auto; width: 0px'
               :array.sync='anchor.x'
               label='x')
    v-btn(icon
          color='red'
          @click='deleteAnchor(idx)')
      v-icon mdi-delete
  v-btn(@click='addAnchor'
        outlined
        color='green') + add
  v-btn.mt-2(@click='runCollocation'
             outlined
             :disabled='running'
             :loading='running'
             color='primary') run collocation
  v-btn.mt-2(@click='download'
             outlined
             color='primary') Download
</template>

<script>
import DirectCollocation from "@/components/planners/directCollocation.js";
import Trajectory from "@/components/planners/trajectory.js";
import Section from "@/components/environments/utils/Section.vue";
import ArrayInput from "@/components/environments/utils/ArrayInput.vue";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import eig from "@eigen";
import _ from "lodash";
import pluginMixin from "@/components/environments/pluginMixin.js";

export default {
  name: "DirectCollocationPlugin",

  mixins: [pluginMixin],

  components: {
    Section,
    ArrayInput,
    ValueInput
  },

  props: {
    system: Object
  },

  data: () => ({
    collocation: null,
    running: false,
    simTraj: null,
    params: {}
  }),

  computed: {
    trajectories() {
      return [this.simTraj];
    }
  },

  created() {
    this.params = _.cloneDeep(this.system.directCollocationParams());
    this.collocation = new DirectCollocation(this.system);
    this.simTraj = new Trajectory(this.system, true);
    if (this.params.traj) {
      this.simTraj.load(this.params.traj);
      this.reset();
    }
  },

  methods: {
    reset() {
      if (this.simTraj.ready()) {
        const x0 = this.simTraj.getState(0);
        this.system.setState(x0);
      }
    },

    ready() {
      return this.simTraj.ready();
    },

    updateSystem(t, dt) {
      if (this.ready()) {
        const u = this.simTraj.getCommand(t);
        const x = this.simTraj.getState(t);
        this.system.setState(x);
        return { u };
      }
    },

    addAnchor() {
      const nx = this.system.shape[0];
      const x0 = [...Array(nx)].map(() => 0);
      this.params.anchors.push({ t: 0, x: x0, key: Math.random() });
    },

    deleteAnchor(idx) {
      this.params.anchors.splice(idx, 1);
    },

    runCollocation() {
      // Get from system
      this.running = true;
      setTimeout(() => {
        this.optimize();
        this.running = false;
        this.$emit("activate", this);
      }, 25);
    },

    optimize() {
      // Parse parameters
      const validation = _.values(this.$refs)
        .filter(input => input.validate)
        .map(input => input.validate());
      if (_.every(validation)) {
        this.collocation.setParams(this.params);
        const rtn = this.collocation.optimize();
        if (rtn) {
          this.simTraj.set(rtn.x, rtn.dt);
          this.reset();
        } else {
          this.$bus.notify("error", "Optimization failed");
        }
      }
    },

    download() {
      const dump = this.simTraj.dump();
      console.log(dump);
      navigator.clipboard.writeText(dump).then(function() {
        console.log('Async: Copying to clipboard was successful!');
      }, function(err) {
        console.error('Async: Could not copy text: ', err);
      });
    }
  }
};
</script>