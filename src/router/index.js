import Vue from 'vue'
import VueRouter from 'vue-router'
import SecondOrder from "@/components/models/secondOrder/SecondOrder.vue";
import DoublePendulum from "@/components/models/doublePendulum/DoublePendulum.vue";
import SimplePendulum from "@/components/SimplePendulum.vue";
import Quadrotor2D from "@/components/Quadrotor2D.vue";
import CartPole from "@/components/CartPole.vue";

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
    icon: 'mdi-lambda'
  },
  {
    path: '/doublePendulum',
    name: 'doublePendulum',
    title: 'Second Order System',
    group: 'Pages',
    component: DoublePendulum,
    rightDrawer: true,
    icon: 'mdi-lambda'
  }
]

const router = new VueRouter({
  // mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export { routes }
export default router
