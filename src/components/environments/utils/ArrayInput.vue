<template lang="pug">
v-text-field(v-model="model", :label="label", outlined, dense, hide-details)
</template>

<script>
export default {
  props: {
    array: Array,
    label: String,
  },

  data: () => ({
    model: "",
    error: null,
  }),

  created() {
    this.model = this.arrToStr(this.array);
  },

  watch: {
    model() {
      this.parseModel();
    },
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
      try {
        const arr = this.strToArr(this.model);
        if (arr.length !== this.array.length) {
          this.error = `The array "${this.label}" [${this.model}] should have ${this.array.length} elements`;
        } else {
          this.$emit("update:array", arr);
        }
      } catch (e) {
        this.error = `The array "${this.label}" [${this.model}] could not be parsed`;
      }
    },

    strToArr(str) {
      return str.split(",").map((i) => parseFloat(i));
    },

    arrToStr(arr) {
      return arr.join(", ");
    },
  },
};
</script>