import Vue from 'vue'
import VueRouter from 'vue-router'
// Environments
import LQR from "@/components/environments/LQR/LQR.vue";
import ValueIteration from "@/components/environments/ValueIteration/ValueIteration.vue";
import RRT from "@/components/environments/RRT/RRT.vue";

Vue.use(VueRouter)

const env = [LQR, ValueIteration, RRT];
const envRoutes = env.map(env => ({
  component: env,
  name: env.name,
  path: `/${env.name}/:systemName`,
  props: true,
  meta: {
    ...env.meta,
    rightDrawer: true,
  }
}));

const routes = [
  {
    path: '/',
  },
  ...envRoutes
]

const router = new VueRouter({
  // mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export { envRoutes }
export default router
