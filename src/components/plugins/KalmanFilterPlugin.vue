<template lang="pug">
Block(title='Kalman Filter')
  MatrixInput.mt-2(label='Init. covariance'
                   :matrix.sync='params.covariance')
  MatrixInput.mt-2(label='Process noise'
                   :matrix.sync='params.processNoise')
  MatrixInput.mt-2(label='Input noise'
                   :matrix.sync='params.inputNoise')
  span.font-weight-light.mt-2 Sensors
  div.mb-3.mt-2(v-for='sensor, idx in params.sensors'
           :key='`sensor_${sensor.key || idx}`'
           style='display: flex; align-items: center')
    span.font-weight-light {{ idx }} -
    ValueInput.ml-2(:ref='`time_${idx}`'
                    :value.sync='sensor.dt'
                    label='dt')
    //- style='flex: 0 0 auto; width: 48px'
    v-btn(icon
          color='red'
          :disabled='params.sensors.length < 2'
          @click='deleteSensor(idx)')
      v-icon mdi-delete
  v-btn(@click='addSensor'
        outlined
         :disabled='params.sensors.length === 0'
        color='green') + add
  v-btn.mt-2(@click='reset'
             outlined
             color='primary') reset filter
</template>

<script>
import Trajectory from "@/components/planners/trajectory.js";
import Block from "./utils/Block.vue";
import pluginMixin from "./pluginMixin.js";
import ValueInput from "./utils/ValueInput.vue";
import MatrixInput from "./utils/MatrixInput.vue";
import ArrayInput from "./utils/ArrayInput.vue";
import KalmanFilter from "@/components/estimators/kalmanFilter.js";
import eig from "@eigen";
import _ from "lodash";
import { setDraggable } from "@/components/twoUtils.js";
import colors from "vuetify/lib/util/colors";
import anime from "animejs";

const DT = 1 / 60;

export default {
  name: "KalmanFilterPlugin",

  mixins: [pluginMixin],

  components: {
    Block,
    ValueInput,
    MatrixInput,
    ArrayInput
  },

  props: {
    system: Object,
    interactivePath: Object
  },

  data: () => ({
    two: Object,
    sigma: Object,
    // Parameters
    params: {}
  }),

  computed: {
    mouseTargetEnabled() {
      return !_.some(this.params.sensors.map(s => s.dragged));
    }
  },

  created() {
    this.kalmanFilter = new KalmanFilter(this.system);
    this.params = this.system.kalmanFilterParams();
    this.reset();
  },

  mounted() {},

  watch: {},

  methods: {
    addSensor() {
      const len = this.params.sensors.length;
      if (len === 0) return;
      const sensor = _.cloneDeep(this.params.sensors[len - 1]);
      sensor.pos = [0, 0];
      this.createSensor(sensor);
      this.params.sensors.push(sensor);
      this.labelSensors();
    },

    deleteSensor(idx) {
      if (this.params.sensors.length < 2) return;
      this.two.remove(this.params.sensors[idx].graphics);
      this.params.sensors.splice(idx, 1);
      this.labelSensors();
    },

    createRadarSensor(sensor) {
      const radius = 18;
      const radar = this.two.makeCircle(0, 0, radius);
      const text = this.two.makeText("", 0, 0);
      text.size = 18;
      text.weight = "bolder";
      text.fill = "#ffffff";
      radar.linewidth = 3;
      radar.stroke = colors.green.darken4;
      radar.fill = colors.green.base;
      const group = this.two.makeGroup(radar, text);
      const pos = this.two.worldToCanvas(sensor.pos);
      group.translation.set(...pos);
      sensor.graphics = group;
      sensor.text = text;
      sensor.anim = () => {
        anime({
          targets: group,
          scale: 1.2,
          round: 1000,
          direction: "alternate",
          easing: "easeInOutSine",
          duration: 200,
          update: () => this.two.update()
        });
      };
      this.two.update();
      const params = {
        scale: 1.1,
        mousedown: () => {
          this.$set(sensor, 'dragged', true);
          console.log('mouse down')
        },
        mouseup: () => {
          this.$set(sensor, 'dragged', false);
          console.log('mouse up')
        },
        mousemove: pos => {
          sensor.pos = this.two.canvasToWorld(pos);
        }
      };
      this.$nextTick(() => {
        setDraggable(group, params);
      });
    },

    createSensor(sensor) {
      switch (sensor.type) {
        case "radar":
          this.createRadarSensor(sensor);
      }
    },

    labelSensors() {
      this.params.sensors.forEach((sensor, idx) => {
        sensor.text.value = `${idx}`;
      });
    },

    createGraphics(two) {
      this.two = two;
      // Create handles
      this.params.sensors.forEach(sensor => this.createSensor(sensor));
      this.labelSensors();
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
      if (!this.sigma.style) return;
      const scale = 2;
      // const P = eig.Matrix.fromArray([[10, 2], [3, 4]]);
      const P = this.kalmanFilter.P.block(0, 0, 2, 2);
      const x = this.kalmanFilter.x.block(0, 0, 2, 1);
      const pos = this.two.worldToCanvas([x.vGet(0), x.vGet(1)]);
      // P.print("P");
      const svd = eig.Decompositions.svd(P, true);
      const sign = Math.sign(svd.U.det());
      const theta = Math.atan2(svd.U.get(0, 1), svd.U.get(0, 0)) * sign;
      const size = [
        svd.sv.vGet(0) * this.two.scale * scale,
        svd.sv.vGet(1) * this.two.scale * scale
      ];
      this.sigma.style.left = `${pos[0] - size[0] / 2}px`;
      this.sigma.style.top = `${pos[1] - size[1] / 2}px`;
      this.sigma.style.width = `${size[0]}px`;
      this.sigma.style.height = `${size[1]}px`;
      this.sigma.style.transform = `rotate(${theta}rad)`;
    },

    // Could be shared w/ dircol
    reset() {
      const P = eig.Matrix.fromArray(this.params.covariance);
      const Q = eig.Matrix.fromArray(this.params.processNoise);
      this.kalmanFilter.reset(P, Q);
      this.params.sensors.forEach(sensor => {
        sensor.tPrev = 0;
      });
      console.log("reset");
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
      this.params.sensors
        .filter(sensor => {
          const tPrev = _.get(sensor, "tPrev", 0);
          return params.t - tPrev > sensor.dt;
        })
        .forEach(sensor => {
          this.kalmanFilter.update(sensor);
          sensor.anim();
          sensor.tPrev = params.t;
          console.log("update");
        });
      this.updateSigma();
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