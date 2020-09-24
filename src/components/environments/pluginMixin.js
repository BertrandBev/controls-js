export default {
  data: () => ({
    active: false
  }),

  computed: {
    name() {
      return this.$options.name
    },

    mouseTargetEnabled() {
      return true; // Override if needed
    }
  },

  methods: {
    createGraphics(two) {
      // Override if needed
    },

    update(t, dt) {
      // Override if needed
    },

    stepSystem() {
      // Override if needed
      return true;
    },

    reset() {
      throw new Error('must be overridden')
    },

    ready() {
      throw new Error('must be overridden')
    },

    updateSystem(t, dt) {
      throw new Error('must be overridden')
    }
  }
}