import Vue from 'vue'
import VueRouter from 'vue-router'
// Environments
import LQR from "@/components/environments/LQR/LQR.vue";
import ValueIteration from "@/components/environments/ValueIteration/ValueIteration.vue";
import RRT from "@/components/environments/RRT/RRT.vue";
import Flatness from "@/components/environments/Flatness/Flatness.vue";
import DirectCollocation from "@/components/environments/DirectCollocation/DirectCollocation.vue";
import MPC from "@/components/environments/MPC/MPC.vue";
import KalmanFilter from "@/components/environments/KalmanFilter/KalmanFilter.vue";

Vue.use(VueRouter)

console.log('FILTER', KalmanFilter.name)

const env = [
  LQR,
  ValueIteration,
  RRT,
  Flatness,
  DirectCollocation,
  MPC,
  KalmanFilter,
];
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
