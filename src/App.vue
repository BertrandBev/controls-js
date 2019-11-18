<template lang='pug'>
v-app
  v-app-bar(app='', color='primary', dark='')
    v-spacer
    v-btn(href='https://github.com/vuetifyjs/vuetify/releases/latest', target='_blank', text='')
      span.mr-2 Latest Release
      v-icon mdi-open-in-new
  v-content
    SimplePendulum
</template>

<script>
import SimplePendulum from '@/components/SimplePendulum.vue';

export default {
  name: 'App',

  components: {
    SimplePendulum,
  },

  data: () => ({
    //
  }),
};
</script>
