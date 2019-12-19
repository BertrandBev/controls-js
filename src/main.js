import Vue from 'vue'
import App from './App.vue'
import router from './router/index.js'
// import store from './store'
import vuetify from './plugins/vuetify';

const store = new Vue({
  data: () => ({
    windowSize: { x: 0, y: 0 }
  })
})
Vue.prototype.$store = store
Vue.config.productionTip = false
new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')
