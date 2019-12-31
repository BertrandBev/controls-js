<template lang="pug">
  div(style='display: flex; flex-direction: column;')
    //* Selector
    div(style='display: flex; justify-content: center')
      span.ml-2.black--text(style='align-self: center') {{ label }}:
      v-spacer
      v-btn(small
            @click='diagonal = true'
            color='blue'
            dark
            :depressed='diagonal'
            :outlined='!diagonal') diagonal
      v-btn.ml-1(small
            @click='diagonal = false'
            color='blue'
            dark
            :depressed='!diagonal'
            :outlined='diagonal') full
    //* Matrix input
    div(v-if='matrix'
        style='display: flex; flex-direction: column')
      div(v-for='row in rows'
          :key='`row_${row}`'
          style='display: flex;')
        v-text-field.ml-1.mt-1(v-for='col in cols'
                    :key='`col_${col}`'
                    :value='getVal(row - 1, col - 1)'
                    @input='val => setVal(row - 1, col - 1, val)'
                    outlined
                    dense
                    small
                    hide-details)
</template>

<script>
import eig from "@eigen";

export default {
  data: () => ({
    diagonal: true
  }),

  props: {
    matrix: Array,
    label: String
  },

  watch: {
    diagonal() {
      if (!this.diagonal) return;
      // Clear off diagonal terms
      for (let i = 0; i < this.matrix.length; i++)
        for (let j = i + 1; j < this.matrix[0].length; j++) {
          this.matrix[i][j] = 0;
          this.matrix[j][i] = 0;
        }
    }
  },

  computed: {
    rows() {
      return this.diagonal ? 1 : this.matrix.length;
    },

    cols() {
      return this.matrix[0].length;
    }
  },

  methods: {
    getVal(i, j) {
      if (this.diagonal) i = j;
      return this.matrix[i][j];
    },

    setVal(i, j, value) {
      if (this.diagonal) i = j;
      const val = parseFloat(value) || 0;
      this.matrix[i][j] = val;
    }
  }
};
</script>