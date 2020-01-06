import _ from 'lodash'
import eig from "@eigen";

export default {
  data: () => ({
    pluginGroup: null,
    system: null
  }),

  computed: {
    activePlugin() {
      return _.get(this.pluginGroup, "active");
    },

    mouseTargetEnabled() {
      return true; // Override if needed
    }
  },

  methods: {
    createGraphics() {
      this.system.createGraphics(this.two, this.scale);
    },

    reset() {
      this.pluginGroup.reset();
    },

    update() {
      // TODO: add FPS meter
      let params = this.system.trim();
      // Update system
      if (this.mouseTargetEnabled && this.mouseTarget) {
        this.system.trackMouse(this.mouseTarget, this.dt);
      } else if (this.pluginGroup && this.pluginGroup.ready()) {
        params = this.pluginGroup.update(this.t, this.dt);
      } else {
        this.system.step(params.u, this.dt);
      }
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, params);
      // Run GC
      eig.GC.flush();
    }
  }
}