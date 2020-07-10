<template lang="pug">
div
  span.font-weight-light.mt-2 Sensors
  div.mb-3.mt-2(v-for='sensor, idx in sensors'
           :key='`sensor_${sensor.key || idx}`'
           style='display: flex; align-items: center')
    span.font-weight-light {{ idx }} -
    ValueInput.ml-2(:ref='`time_${idx}`'
                    :value.sync='sensor.dt'
                    label='dt')
    //- style='flex: 0 0 auto; width: 48px'
    v-btn(icon
          color='red'
          @click='deleteSensor(idx)')
      v-icon mdi-delete
  v-btn(@click='addSensor'
        outlined
         :disabled='params.sensors.length === 0'
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
    sensors: []
  }),

  props: {
    params: Object,
    system: Object
  },

  computed: {
    sensorDragged() {
      return _.some(this.sensors.map(s => s.dragged));
    }
  },

  created() {
    this.reset();
  },

  methods: {
    reset() {
      // [...Array(this.sensors.length)].forEach(() => this.deleteSensor(0));
      this.sensors.forEach(s => {
        s.tPrev = 0;
      });
    },

    createGraphics(two) {
      this.two = two;
      // Create handles
      this.sensors = _.cloneDeep(this.params.sensors);
      this.sensors.forEach(sensor => this.createSensor(sensor));
      this.labelSensors();
      this.reset();
    },

    addSensor() {
      if (this.params.sensors.length === 0) return;
      const sensor = _.cloneDeep(this.params.sensors[0]);
      sensor.pos = [0, 0];
      this.createSensor(sensor);
      this.sensors.push(sensor);
      this.labelSensors();
    },

    deleteSensor(idx) {
      this.two.remove(this.sensors[idx].graphics);
      this.sensors.splice(idx, 1);
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
          this.$set(sensor, "dragged", true);
        },
        mouseup: () => {
          this.$set(sensor, "dragged", false);
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
      this.sensors.forEach((sensor, idx) => {
        sensor.text.value = `${idx}`;
      });
    },

    update(t) {
      // Run update step
      this.sensors
        .filter(sensor => {
          const tPrev = sensor.tPrev || 0;
          return t - tPrev > sensor.dt;
        })
        .forEach(sensor => {
          this.$emit("update", sensor);
          sensor.anim();
          sensor.tPrev = t;
        });
    }
  }
};
</script>