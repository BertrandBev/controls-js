import Vue from 'vue'
import VueRouter from 'vue-router'
import SimplePendulum from "@/components/SimplePendulum.vue";
import Quadrotor2D from "@/components/Quadrotor2D.vue";
import CartPole from "@/components/CartPole.vue";
import SecondOrder from "@/components/SecondOrder.vue";
import LineChart from "@/components/LineChart.vue";
import ModelPanel from "@/views/ModelPanel.vue";

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
    component: ModelPanel,
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
