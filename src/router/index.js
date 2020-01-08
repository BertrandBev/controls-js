import Vue from 'vue'
import VueRouter from 'vue-router'
import SecondOrder from "@/components/models/secondOrder/SecondOrder.vue";
import DoublePendulum from "@/components/models/doublePendulum/DoublePendulum.vue";
import Quadrotor2D from "@/components/models/quadrotor2D/Quadrotor2D.vue";
import Car from "@/components/models/car/Car.vue";

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    redirect: 'secondOrder'
  },
  {
    path: '/secondOrder',
    name: 'secondOrder',
    title: 'Second Order System',
    group: 'Pages',
    component: SecondOrder,
    rightDrawer: true,
    icon: 'mdi-alpha'
  },
  {
    path: '/doublePendulum',
    name: 'doublePendulum',
    title: 'Double pendulum',
    group: 'Pages',
    component: DoublePendulum,
    rightDrawer: true,
    icon: 'mdi-beta'
  },
  {
    path: '/quadrotor2D',
    name: 'quadrotor2D',
    title: 'Quadrotor 2D',
    group: 'Pages',
    component: Quadrotor2D,
    rightDrawer: true,
    icon: 'mdi-gamma'
  },
  {
    path: '/car',
    name: 'car',
    title: 'Car',
    group: 'Pages',
    component: Car,
    rightDrawer: true,
    icon: 'mdi-epsilon'
  }
]

const router = new VueRouter({
  // mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export { routes }
export default router
