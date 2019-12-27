import Vue from 'vue'
import App from './App.vue'
import router from './router/index.js'
// import store from './store'
import vuetify from './plugins/vuetify';
import Notifications from 'vue-notification'

// Add simple store
const store = new Vue({
  data: () => ({
    windowSize: { x: 0, y: 0 }
  })
})
Vue.prototype.$store = store

// Add bus
const bus = new Vue()
Vue.prototype.$bus = bus

// Add notification handler
Vue.use(Notifications)
bus.notify = (type, msg) => {
  Vue.notify({
    group: "alert",
    title: { error: "Error", success: "Success" }[type],
    text: msg,
    type: { error: "type-error", success: "type-success" }[type],
    duration: 6000
  });
}

Vue.config.productionTip = false
new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')
