<template lang="pug">
Block(title='Particle Filter')
  //- MatrixInput.mt-2(label='Init. covariance'
  //-                  :matrix.sync='params.covariance')
  //- MatrixInput.mt-2(label='Process noise'
  //-                  :matrix.sync='params.processNoise')
  //- MatrixInput.mt-2(label='Input noise'
  //-                  :matrix.sync='params.inputNoise')
  ValueInput(:value.sync='params.nPts'
             label='Point number')
  ValueInput.mt-2(:value.sync='params.dt'
                  label='Resampling period')
  MatrixInput.mt-2(:matrix.sync='params.processNoise'
                   label='Process noise')
  Sensors.mt-2(ref='sensors'
              :system='system'
              :params='params'
              @update='sensorUpdate')
  v-btn.mt-2(@click='resample'
             outlined
             color='purple') resample
  v-btn.mt-2(@click='reset'
             outlined
             color='primary') reset filter
</template>

<script>
import eig from "@eigen";
import _ from "lodash";
import Block from "./utils/Block.vue";
import pluginMixin from "./pluginMixin.js";
import ValueInput from "./utils/ValueInput.vue";
import MatrixInput from "./utils/MatrixInput.vue";
import ArrayInput from "./utils/ArrayInput.vue";
import Sensors from "./utils/Sensors.vue";
import ParticleFilter from "@/components/estimators/particleFilter.js";
import { setDraggable } from "@/components/twoUtils.js";
import colors from "vuetify/lib/util/colors";
import chroma from "chroma-js";

const DT = 1 / 60;

export default {
  name: "ParticleFilterPlugin",

  mixins: [pluginMixin],

  components: {
    Block,
    ValueInput,
    MatrixInput,
    ArrayInput,
    Sensors
  },

  props: {
    system: Object,
    interactivePath: Object
  },

  data: () => ({
    two: null,
    // Parameters
    particleGraphics: [],
    params: {},
    // Update
    tResample: 0
  }),

  computed: {
    sensors() {
      return this.$refs.sensors;
    },

    mouseTargetEnabled() {
      return !this.sensors.sensorDragged;
    }
  },

  created() {
    this.particleFilter = new ParticleFilter(this.system);
    this.params = this.system.particleFilterParams();
  },

  mounted() {
    this.reset();
  },

  watch: {},

  methods: {
    createGraphics(two) {
      this.two = two;
      // Create sensors
      this.sensors.createGraphics(two);
      // Create particles
      this.updateGraphics();
    },

    createParticleGraphic() {
      if (!this.two) return;
      let particle;
      switch (this.params.type) {
        case "2d": {
          const rad = 8;
          const circle = this.two.makeCircle(0, 0, rad);
          circle.noStroke();
          const line = this.two.makeLine(0, 0, rad, 0);
          line.stroke = "#000000";
          const group = this.two.makeGroup(circle, line);
          const scale = chroma.scale([colors.red.base, colors.green.base]);
          const setColor = weight => {
            circle.fill = scale(weight);
          };
          this.particleGraphics.push({ group, setColor });
          break;
        }
        default:
          throw new Error(this.params.type + " unsupported");
      }
    },

    updateParticleGraphic(particle, graphic) {
      switch (this.params.type) {
        case "2d": {
          const x = particle.system.x;
          const pos = this.two.worldToCanvas([x.vGet(0), x.vGet(1)]);
          graphic.group.translation.set(...pos);
          graphic.group.rotation = -x.vGet(2);
          graphic.setColor(particle.weight);
          break;
        }
      }
    },

    updateGraphics() {
      // Match particle number
      const maxParticles = 50;
      const particles = this.particleFilter.particles;
      const nPts = Math.min(maxParticles, particles.length);
      for (let k = this.particleGraphics.length; k < nPts; k++) {
        this.createParticleGraphic();
      }
      for (
        let k = this.particleGraphics.length - 1;
        k >= particles.length;
        k--
      ) {
        this.two.remove(this.particleGraphics[k].group);
        this.particleGraphics.splice(k, 1);
      }
      // Update particle state
      this.particleGraphics.forEach((g, idx) => {
        const particle = particles[idx];
        this.updateParticleGraphic(particle, g);
      });
    },

    // Could be shared w/ dircol
    reset() {
      // const P = eig.Matrix.fromArray(this.params.covariance);
      // const Q = eig.Matrix.fromArray(this.params.processNoise);
      this.particleFilter.reset(this.params);
      this.sensors.reset();
    },

    resample() {
      this.particleFilter.resample();
    },

    update(params) {
      this.particleFilter.predict(params.u, params.dt);
      this.updateGraphics();
      // Run update sensors
      this.sensors.update(params.t);
      // Resample if needed
      const now = Date.now() / 1000;
      if (now - this.tResample > this.params.dt) {
        this.resample();
        this.tResample = now;
      }
    },

    sensorUpdate(sensor) {
      this.particleFilter.update(sensor);
    },

    ready() {
      return false;
    },

    updateSystem(t, dt) {}
  }
};
</script>

<style>
</style>