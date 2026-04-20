import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import ExamPage from '../views/ExamPage.vue'
import ResultsPage from '../views/ResultsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingPage
    },
    {
      path: '/exam/:sessionType',
      name: 'exam',
      component: ExamPage,
      props: true
    },
    {
      path: '/results',
      name: 'results',
      component: ResultsPage
    }
  ]
})

export default router
