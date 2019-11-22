<template lang='pug'>
v-app
  v-app-bar(app='', color='primary', dark='')
    v-spacer
    v-btn(href='https://github.com/vuetifyjs/vuetify/releases/latest', target='_blank', text='')
      span.mr-2 Latest Release
      v-icon mdi-open-in-new
  v-content
    v-row(v-if='loading'
          align='center'
          justify='center'
          style='height: 100%')
      v-progress-circular(:size='40'
                          color='blue'
                          indeterminate)
    div(style='height: 100%')
      SimplePendulum(v-if='!loading')
      //- LineChart
</template>

<script>
import SimplePendulum from "@/components/SimplePendulum.vue";
import LineChart from "@/components/LineChart.vue";
const eig = require("../lib/eigen-js/eigen.js");

export default {
  name: "App",

  components: {
    SimplePendulum,
    LineChart
  },

  data: () => ({
    loading: true
  }),

  created() {
    eig.ready = () => {
      this.loading = false;
    };
  }
};
</script>
