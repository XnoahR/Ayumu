import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import AnkiPage from '../views/AnkiPage.vue'
import AnkiDecksPage from '../views/anki/AnkiDecksPage.vue'
import AnkiReviewPage from '../views/anki/AnkiReviewPage.vue'
import AnkiPluginsPage from '../views/anki/AnkiPluginsPage.vue'
import AnkiDesignPage from '../views/anki/AnkiDesignPage.vue'
import AnkiSettingsPage from '../views/anki/AnkiSettingsPage.vue'
import AnkiAccountPage from '../views/anki/AnkiAccountPage.vue'
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
      component: AnkiPage,
      children: [
        {
          path: '',
          redirect: '/anki/decks',
        },
        {
          path: 'decks',
          name: 'anki-decks',
          component: AnkiDecksPage,
        },
        {
          path: 'review',
          name: 'anki-review',
          component: AnkiReviewPage,
        },
        {
          path: 'plugins',
          name: 'anki-plugins',
          component: AnkiPluginsPage,
        },
        {
          path: 'design',
          name: 'anki-design',
          component: AnkiDesignPage,
        },
        {
          path: 'settings',
          name: 'anki-settings',
          component: AnkiSettingsPage,
        },
        {
          path: 'account',
          name: 'anki-account',
          component: AnkiAccountPage,
        },
      ],
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
      redirect: '/anki'
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
