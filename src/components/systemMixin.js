import _ from 'lodash'
import eig from "@eigen";

export default {
  data: () => ({
    system: null,
    isMounted: false
  }),

  computed: {
    mouseTargetEnabled() {
      return true; // Override if needed
    }
  },

  mounted() {
    this.isMounted = true;
    this.createGraphics();
  },

  methods: {
    createGraphics() {
      this.system.createGraphics(this.two, this.scale);
      const plugin = this.$refs.plugin;
      plugin.createGraphics(this.two);
    },

    reset() {
      this.$refs.plugin.reset();
    },

    update() {
      const plugin = this.$refs.plugin;
      // TODO: add FPS meter
      let params = {};
      // Update system
      const stepSystem = !plugin || plugin.stepSystem();
      if (this.mouseTargetEnabled && this.mouseTarget && stepSystem) {
        params = this.system.trackMouse(this.mouseTarget, this.dt);
      } else if (plugin && plugin.ready()) {
        params = plugin.updateSystem(this.t, this.dt);
      } else if (stepSystem) {
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