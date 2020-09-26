<template lang="pug">
Section(title='Kalman Filter')
  MatrixInput.mt-2(label='Init. covariance'
                   :matrix.sync='params.covariance')
  MatrixInput.mt-2(label='Process noise'
                   :matrix.sync='params.processNoise')
  MatrixInput.mt-2(label='Input noise'
                   :matrix.sync='params.inputNoise')
  Sensors(ref='sensors'
          :system='system'
          :params='params'
          @update='sensorUpdate')
  v-btn.mt-2(@click='reset'
             outlined
             color='primary') reset filter
</template>

<script>
import Sensors from "@/components/environments/utils/Sensors.vue";
import Section from "@/components/environments/utils/Section.vue";
import pluginMixin from "@/components/environments/pluginMixin.js";
import ValueInput from "@/components/environments/utils/ValueInput.vue";
import MatrixInput from "@/components/environments/utils/MatrixInput.vue";
import ArrayInput from "@/components/environments/utils/ArrayInput.vue";
import KalmanFilter from "@/components/estimators/kalmanFilter.js";
import eig from "@eigen";
import _ from "lodash";
import colors from "vuetify/lib/util/colors";

const DT = 1 / 60;

export default {
  name: "KalmanFilterPlugin",

  mixins: [pluginMixin],

  components: {
    Section,
    ValueInput,
    MatrixInput,
    ArrayInput,
    Sensors
  },

  props: {
    system: Object,
  },

  data: () => ({
    two: null,
    sigma: null,
    kalmanFilter: null,
    // Parameters
    params: {}
  }),

  computed: {
    mouseTargetEnabled() {
      return !this.$refs.sensors.sensorDragged;
    }
  },

  created() {
    this.kalmanFilter = new KalmanFilter(this.system);
    this.params = this.system.kalmanFilterParams();
  },

  mounted() {
    console.log('sensors', this.$refs.sensors)
    this.reset();
  },

  watch: {},

  methods: {
    createGraphics(two) {
      this.two = two;
      // Create sensors
      console.log('create graphics', this.$refs.sensors)
      this.$refs.sensors.createGraphics(two);
      // Create sigma on screen
      const container = two.canvas.parentNode;
      this.sigma = document.createElement("div");
      this.sigma.style.width = "0px";
      this.sigma.style.height = "0px";
      this.sigma.style.position = "absolute";
      this.sigma.style.background =
        "radial-gradient(closest-side, #1f96f2 0%, rgba(0, 174, 255, 0) 100%)";
      container.insertBefore(this.sigma, container.childNodes[0]);
    },

    updateSigma() {
      if (!this.sigma) return;
      const scale = 2;
      // const P = eig.Matrix.fromArray([[10, 2], [3, 4]]);
      const P = this.kalmanFilter.P.block(0, 0, 2, 2);
      const x = this.kalmanFilter.x.block(0, 0, 2, 1);
      console.log('world2canvas', this.two)
      const pos = this.two.worldToCanvas([x.vGet(0), x.vGet(1)]);
      const center = this.two.worldToCanvas([0, 0])
      pos[0] -= center[0]; pos[1] -= center[1];
      // P.print("P");
      const svd = eig.Decompositions.svd(P, true);
      const sign = Math.sign(svd.U.det());
      const theta = Math.atan2(svd.U.get(0, 1), svd.U.get(0, 0)) * sign;
      const size = [
        svd.sv.vGet(0) * this.two.scale * scale,
        svd.sv.vGet(1) * this.two.scale * scale
      ];
      this.sigma.style.left = `calc(50% + ${pos[0] - size[0] / 2}px)`;
      this.sigma.style.top = `calc(50% + ${pos[1] - size[1] / 2}px)`;
      this.sigma.style.width = `${size[0]}px`;
      this.sigma.style.height = `${size[1]}px`;
      this.sigma.style.transform = `rotate(${theta}rad)`;
    },

    // Could be shared w/ dircol
    reset() {
      const P = eig.Matrix.fromArray(this.params.covariance);
      const Q = eig.Matrix.fromArray(this.params.processNoise);
      this.kalmanFilter.reset(P, Q);
      this.$refs.sensors.reset();
    },

    update(params) {
      // Inject process noise at u
      const mean = new eig.Matrix(2, 1);
      const cov = eig.Matrix.fromArray(this.params.inputNoise);
      const rdn = eig.Random.normal(mean, cov, 1);
      const u = params.u.matAdd(rdn);

      // Run prediction step
      this.kalmanFilter.predict(u, params.dt);

      // Run update step
      this.$refs.sensors.update(params.t);
      this.updateSigma();
    },

    sensorUpdate(sensor) {
      this.kalmanFilter.update(sensor);
    },

    ready() {
      return false;
    },

    updateSystem(t, dt) {},
  }
};
</script>

<style>
</style>