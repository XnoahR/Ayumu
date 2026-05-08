import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import AnkiPage from '../views/AnkiPage.vue'
import ExamPage from '../views/ExamPage.vue'
import ResultsPage from '../views/ResultsPage.vue'
import ProfilePage from '../views/ProfilePage.vue'
import LeaderboardPage from '../views/LeaderboardPage.vue'
import ComingSoonPage from '../views/ComingSoonPage.vue'

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
    },
    {
      path: '/flashcard',
      name: 'flashcard',
      component: ComingSoonPage,
      props: {
        title: 'Flashcard',
        description: 'Flashcards are warming up. Soon this space will help you review small pieces before a full practice run.',
      }
    },
    {
      path: '/kanji',
      name: 'kanji',
      component: ComingSoonPage,
      props: {
        title: 'Kanji',
        description: 'Kanji practice is coming soon. For now, this page keeps the path ready without interrupting your study flow.',
      }
    }
  ]
})

export default router
