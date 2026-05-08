import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import AnkiPage from '../views/AnkiPage.vue'
import ExamPage from '../views/ExamPage.vue'
import ResultsPage from '../views/ResultsPage.vue'
import ProfilePage from '../views/ProfilePage.vue'
import LeaderboardPage from '../views/LeaderboardPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingPage
    },
    {
      path: '/anki',
      name: 'anki',
      component: AnkiPage
    },
    {
      path: '/exam/:sessionCode',
      name: 'exam',
      component: ExamPage,
      props: true
    },
    {
      path: '/results/:sessionCode',
      name: 'results',
      component: ResultsPage,
      props: true
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: LeaderboardPage
    }
  ]
})

export default router
