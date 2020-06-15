import _ from 'lodash'
import eig from "@eigen";

export default {
  data: () => ({
    system: null
  }),

  computed: {
    mouseTargetEnabled() {
      return true; // Override if needed
    }
  },

  methods: {
    createGraphics() {
      this.system.createGraphics(this.two, this.scale);
    },

    reset() {
      this.$refs.plugin.reset();
    },

    update() {
      const plugin = this.$refs.plugin;
      // TODO: add FPS meter
      let params = {};
      // Update system
      if (this.mouseTargetEnabled && this.mouseTarget) {
        params = this.system.trackMouse(this.mouseTarget, this.dt);
      } else if (plugin && plugin.ready()) {
        params = plugin.updateSystem(this.t, this.dt);
      } else {
        params = this.system.trim();
        this.system.step(params.u, this.dt);
      }
      params.t = this.t;
      params.dt = this.dt;
      // Update plugins
      if (plugin) plugin.update(params);
      // Graphic update
      this.system.updateGraphics(this.worldToCanvas, params);
      // Run GC
      eig.GC.flush();
    }
  }
}