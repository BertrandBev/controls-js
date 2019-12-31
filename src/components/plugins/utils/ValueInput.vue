<template lang="pug">
  v-text-field(v-model.number='model'
               :label='label'
               outlined
               dense
               hide-details)
</template>

<script>
export default {
  props: {
    value: Number,
    label: String
  },

  data: () => ({
    model: 0,
    error: null
  }),

  created() {
    this.model = this.value;
  },

  watch: {
    model() {
      this.parseModel();
    }
  },

  methods: {
    validate() {
      if (this.error) {
        this.$bus.notify("error", this.error);
      }
      return !this.error;
    },

    parseModel() {
      this.error = null;
      if (isNaN(parseFloat(this.model))) {
        this.error = `The value "${this.label}" should be defined`;
      } else {
        this.$emit("update:value", this.model);
      }
    }
  }
};
</script>