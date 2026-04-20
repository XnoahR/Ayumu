import { reactive, computed } from 'vue'
import rawData from '../../local_data/N5 - 2010-2011.json'

export const examStore = reactive({
  currentSession: null, // 'full_exam'
  currentIndex: 0,
  userAnswers: {}, // { questionIndex: selectedOption }
  optionOrders: [], // array of arrays, e.g. [[3, 1, 4, 2], ...]
  isDarkMode: false,
  activeTheme: 'lavender', // 'lavender', 'philia', 'wisteria', 'mauve'
  uiSize: 'medium', // 'medium', 'small'
  
  questions: rawData,

  get activeQuestions() {
    return this.questions
  },

  get currentQuestion() {
    return this.activeQuestions[this.currentIndex]
  },

  get calculateScore() {
    let count = 0
    this.activeQuestions.forEach((q, idx) => {
      if (String(this.userAnswers[idx]) === q.correct_answer) {
        count++
      }
    })
    return count
  },

  startSession(type = 'full_exam') {
    this.currentSession = type
    this.currentIndex = 0
    this.userAnswers = {}
    
    // Generate randomized option orders for all questions
    this.optionOrders = this.activeQuestions.map(() => {
      const order = [1, 2, 3, 4]
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = order[i];
        order[i] = order[j];
        order[j] = temp;
      }
      return order
    })
  },

  selectOption(optionIndex) {
    this.userAnswers[this.currentIndex] = optionIndex
  },

  goToQuestion(index) {
    this.currentIndex = index
  },

  nextQuestion() {
    if (this.currentIndex < this.activeQuestions.length - 1) {
      this.currentIndex++
    }
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--
    }
  },

  setTheme(themeName) {
    this.activeTheme = themeName
    document.documentElement.className = ''
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark')
    }
    if (themeName !== 'lavender') {
      document.documentElement.classList.add(`theme-${themeName}`)
    }
  },

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode
    this.setTheme(this.activeTheme)
  },

  toggleUiSize(size) {
    this.uiSize = size || (this.uiSize === 'medium' ? 'small' : 'medium')
  },

  reset() {
    this.currentSession = null
    this.currentIndex = 0
    this.userAnswers = {}
  }
})
