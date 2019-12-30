export default {
  data: () => ({
    active: false
  }),

  computed: {
    name() {
      return this.$options.name
    }
  },

  methods: {
    reset() {
      throw new Error('must be overridden')
    },

    ready() {
      throw new Error('must be overridden')
    },

    update(t, dt) {
      throw new Error('must be overridden')
    },
  }
}