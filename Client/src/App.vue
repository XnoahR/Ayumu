<script setup>
import { computed, onMounted, ref } from 'vue'

const sectionLabels = {
  grammar: 'Grammar',
  kanji: 'Kanji',
  listening: 'Listening',
  reading: 'Reading',
  vocab: 'Vocabulary',
}

const levels = ref([])
const sections = ref([])
const counts = ref({})
const selectedLevel = ref('N3')
const selectedSection = ref('grammar')
const exercises = ref([])
const packages = ref([])
const quiz = ref(null)
const currentIndex = ref(0)
const selectedOptions = ref({})
const flaggedQuestions = ref({})
const collapsedSessions = ref({})
const results = ref({})
const loading = ref(false)
const error = ref('')
const apiStatus = ref('checking')

const currentQuestion = computed(() => quiz.value?.questions?.[currentIndex.value] || null)
const answeredCount = computed(() =>
  Object.values(selectedOptions.value).filter((value) => Boolean(value)).length
)
const flaggedCount = computed(() =>
  Object.values(flaggedQuestions.value).filter((value) => Boolean(value)).length
)
const correctCount = computed(() => Object.values(results.value).filter((result) => result.correct).length)
const progressPercent = computed(() => {
  if (!quiz.value?.questions?.length) return 0
  return Math.round((answeredCount.value / quiz.value.questions.length) * 100)
})
const quizTitle = computed(() => {
  if (!quiz.value) return 'JLPT Quiz Practice'
  return quiz.value.type === 'package' ? quiz.value.package.title : quiz.value.exercise.title
})
const activeSectionName = computed(() => {
  if (currentQuestion.value?.packageItem?.section) {
    return sectionName(currentQuestion.value.packageItem.section)
  }

  if (quiz.value?.exercise?.section) {
    return sectionName(quiz.value.exercise.section)
  }

  return 'Mojigoi'
})
const displayContext = computed(() => {
  if (!currentQuestion.value) return ''
  return stripRepeatedPassage(currentQuestion.value.context, currentQuestion.value.passage?.content, {
    removeContainedText: true,
  })
})
const displayPrompt = computed(() => {
  if (!currentQuestion.value) return ''
  return stripRepeatedPassage(currentQuestion.value.prompt, currentQuestion.value.passage?.content)
})
const navigatorSections = computed(() => {
  if (!quiz.value?.questions?.length) return []

  const sessionOrder = [
    { key: 'kanji_vocab', label: 'Kanji & Vocab', sections: ['kanji', 'vocab'] },
    { key: 'grammar', label: 'Grammar', sections: ['grammar'] },
    { key: 'reading', label: 'Reading', sections: ['reading'] },
    { key: 'listening', label: 'Listening', sections: ['listening'] },
  ]

  const buckets = new Map(sessionOrder.map((session) => [session.key, { ...session, questions: [] }]))
  const fallback = { key: 'other', label: activeSectionName.value, sections: [], questions: [] }

  quiz.value.questions.forEach((question, index) => {
    const rawSection = question.packageItem?.section || quiz.value.exercise?.section || 'other'
    const target = sessionOrder.find((session) => session.sections.includes(rawSection))
    const item = { question, index }

    if (target) {
      buckets.get(target.key).questions.push(item)
    } else {
      fallback.questions.push(item)
    }
  })

  const grouped = [...buckets.values()].filter((session) => session.questions.length)
  if (fallback.questions.length) grouped.push(fallback)

  return grouped
})

function sectionName(section) {
  return sectionLabels[section] || section
}

function normalizeAssetUrl(asset) {
  return asset?.url || asset?.sourceUrl || ''
}

function isAnswered(questionId) {
  return Boolean(selectedOptions.value[questionId])
}

function isSessionCollapsed(sessionKey) {
  return Boolean(collapsedSessions.value[sessionKey])
}

function toggleSessionCollapse(sessionKey) {
  collapsedSessions.value = {
    ...collapsedSessions.value,
    [sessionKey]: !collapsedSessions.value[sessionKey],
  }
}

function toggleFlag(questionId) {
  flaggedQuestions.value = {
    ...flaggedQuestions.value,
    [questionId]: !flaggedQuestions.value[questionId],
  }
}

function sessionAnsweredCount(session) {
  return session.questions.filter((item) => isAnswered(item.question.id)).length
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripRepeatedPassage(text, passageContent, options = {}) {
  if (!text) return ''
  if (!passageContent) return text

  const normalizedText = normalizeWhitespace(text)
  const normalizedPassage = normalizeWhitespace(passageContent)

  if (!normalizedText || !normalizedPassage) {
    return text
  }

  if (normalizedText === normalizedPassage) {
    return ''
  }

  if (options.removeContainedText && normalizedPassage.includes(normalizedText)) {
    return ''
  }

  if (normalizedText.startsWith(normalizedPassage)) {
    return normalizedText.slice(normalizedPassage.length).trim()
  }

  return text
}

async function api(path, options) {
  const response = await fetch(path, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

async function loadMetadata() {
  const data = await api('/api/metadata')
  levels.value = data.levels
  sections.value = data.sections
  counts.value = data.counts

  if (!levels.value.includes(selectedLevel.value)) {
    selectedLevel.value = levels.value[0] || 'N5'
  }

  if (!sections.value.includes(selectedSection.value)) {
    selectedSection.value = sections.value[0] || 'grammar'
  }
}

async function loadExercises() {
  exercises.value = []
  const data = await api(`/api/exercises?level=${selectedLevel.value}&section=${selectedSection.value}`)
  exercises.value = data.exercises
}

async function loadPackages() {
  packages.value = []
  const data = await api(`/api/packages?level=${selectedLevel.value}&userKey=test`)
  packages.value = data.packages
}

async function refreshCatalog() {
  loading.value = true
  error.value = ''

  try {
    await Promise.all([loadExercises(), loadPackages()])
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function selectLevel(level) {
  selectedLevel.value = level
  quiz.value = null
  await refreshCatalog()
}

async function selectSection(section) {
  selectedSection.value = section
  quiz.value = null
  await loadExercises()
}

async function startExercise(exerciseId) {
  await loadQuiz(`/api/exercises/${exerciseId}/quiz`)
}

async function startPackage(packageId) {
  await loadQuiz(`/api/packages/${packageId}/quiz`)
}

async function generatePackage() {
  loading.value = true
  error.value = ''

  try {
    const data = await api('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: selectedLevel.value,
        userKey: 'test',
        templateId: 'balanced_75',
      }),
    })

    await loadPackages()
    await startPackage(data.package.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadQuiz(path) {
  loading.value = true
  error.value = ''

  try {
    quiz.value = await api(path)
    currentIndex.value = 0
    selectedOptions.value = {}
    flaggedQuestions.value = {}
    collapsedSessions.value = {}
    results.value = {}
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function submitAnswer() {
  if (!currentQuestion.value) return

  const questionId = currentQuestion.value.id
  const selectedOption = selectedOptions.value[questionId]
  if (!selectedOption) return

  loading.value = true
  error.value = ''

  try {
    const result = await api(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedOption }),
    })

    results.value = {
      ...results.value,
      [questionId]: result,
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function nextQuestion() {
  if (!quiz.value) return
  currentIndex.value = Math.min(currentIndex.value + 1, quiz.value.questions.length - 1)
}

function previousQuestion() {
  currentIndex.value = Math.max(currentIndex.value - 1, 0)
}

function jumpToQuestion(index) {
  currentIndex.value = index
}

function backToCatalog() {
  quiz.value = null
}

function finishExam() {
  backToCatalog()
}

onMounted(async () => {
  try {
    const health = await api('/api/health')
    apiStatus.value = health.supabaseConfigured ? 'connected' : 'server-only'
    await loadMetadata()
    await refreshCatalog()
  } catch (err) {
    apiStatus.value = 'offline'
    error.value = err.message
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#edf0f4] text-[#101828]">
    <header class="h-16 border-b-2 border-[#aeb7c4] bg-white">
      <div class="flex h-full items-center justify-between px-6">
        <div class="flex items-center gap-5">
          <div class="text-xl font-black tracking-tight text-[#1f2937]">AYUMU</div>
          <div class="h-7 w-px bg-[#98a2b3]"></div>
          <div>
            <p class="text-[11px] font-normal uppercase tracking-[0.26em] text-[#344054]">
              {{ quiz ? `${activeSectionName} Assessment` : 'Assessment Console' }}
            </p>
            <p class="mt-0.5 text-xs font-bold text-[#344054]">{{ quiz ? quizTitle : 'JLPT practice administration' }}</p>
          </div>
        </div>

        <button
          type="button"
          class="rounded-[2px] border-2 border-[#aeb7c4] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#7a1f2b] transition hover:bg-[#fff1f2]"
          @click="quiz ? finishExam() : null"
        >
          {{ quiz ? 'Exit Simulation' : `API ${apiStatus}` }}
        </button>
      </div>
    </header>

    <p v-if="error" class="mx-auto mt-4 max-w-6xl rounded-[2px] border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>

    <section v-if="!quiz" class="mx-auto max-w-6xl px-5 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-black tracking-tight text-[#101828]">Assessment Setup</h1>
        <p class="mt-1 text-sm text-[#667085]">Select a JLPT level, section, and exam set to begin a controlled practice session.</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside class="space-y-4">
          <section class="rounded-[2px] border-2 border-[#aeb7c4] bg-white p-4">
            <h2 class="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#475467]">Level</h2>
            <div class="grid grid-cols-5 gap-2 lg:grid-cols-1">
              <button
                v-for="level in levels"
                :key="level"
                type="button"
                class="rounded-[2px] border-2 px-3 py-2 text-sm font-black transition"
                :class="selectedLevel === level ? 'border-[#1f2937] bg-[#1f2937] text-white' : 'border-[#b8c0cc] bg-white text-[#344054] hover:border-[#1f2937]'"
                @click="selectLevel(level)"
              >
                {{ level }}
              </button>
            </div>
          </section>

          <section class="rounded-[2px] border-2 border-[#aeb7c4] bg-white p-4">
            <h2 class="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#475467]">Section</h2>
            <div class="space-y-2">
              <button
                v-for="section in sections"
                :key="section"
                type="button"
                class="flex w-full items-center justify-between rounded-[2px] border-2 px-3 py-2 text-left text-sm transition"
                :class="selectedSection === section ? 'border-[#1f2937] bg-[#e7ebf0] text-[#101828]' : 'border-[#b8c0cc] bg-white text-[#344054] hover:border-[#1f2937]'"
                @click="selectSection(section)"
              >
                <span class="font-medium">{{ sectionName(section) }}</span>
                <span class="rounded-[2px] bg-[#e7ebf0] px-2 py-0.5 text-xs text-[#475467]">{{ counts[selectedLevel]?.[section] || 0 }}</span>
              </button>
            </div>
          </section>
        </aside>

        <section class="space-y-6">
          <section class="rounded-[2px] border-2 border-[#aeb7c4] bg-white">
            <div class="flex items-center justify-between border-b-2 border-[#c6ced9] px-5 py-4">
              <div>
                <h2 class="text-base font-black text-[#101828]">Generated Exam Sets</h2>
                <p class="mt-1 text-sm text-[#667085]">Grouped passages and shared assets are kept in one exam set.</p>
              </div>
              <button
                type="button"
                class="rounded-[2px] bg-[#1f2937] px-4 py-2 text-sm font-black text-white transition hover:bg-[#344054] disabled:bg-[#b9c2d0]"
                :disabled="loading"
                @click="generatePackage"
              >
                Generate Set
              </button>
            </div>

            <div class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="item in packages"
                :key="item.id"
                type="button"
                class="rounded-[2px] border-2 border-[#b8c0cc] bg-white p-4 text-left transition hover:border-[#1f2937] hover:bg-[#f4f6f8]"
                @click="startPackage(item.id)"
              >
                <p class="font-black text-[#101828]">{{ item.title }}</p>
                <p class="mt-1 text-sm text-[#667085]">{{ item.question_count }} questions - {{ item.unit_count }} units</p>
              </button>
              <p v-if="!packages.length" class="text-sm text-[#667085]">No generated sets for this level.</p>
            </div>
          </section>

          <section class="rounded-[2px] border-2 border-[#aeb7c4] bg-white">
            <div class="flex items-center justify-between border-b-2 border-[#c6ced9] px-5 py-4">
              <div>
                <h2 class="text-base font-black text-[#101828]">{{ selectedLevel }} {{ sectionName(selectedSection) }} Exercises</h2>
                <p class="mt-1 text-sm text-[#667085]">Start a section-specific practice session.</p>
              </div>
              <span v-if="loading" class="text-sm text-[#667085]">Loading...</span>
            </div>

            <div class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="exercise in exercises"
                :key="exercise.id"
                type="button"
                class="rounded-[2px] border-2 border-[#b8c0cc] bg-white p-4 text-left transition hover:border-[#1f2937] hover:bg-[#f4f6f8]"
                @click="startExercise(exercise.id)"
              >
                <p class="text-xs font-semibold uppercase tracking-wide text-[#667085]">Exercise {{ exercise.exercise_number || '-' }}</p>
                <p class="mt-2 font-black text-[#101828]">{{ exercise.title }}</p>
              </button>
            </div>
          </section>
        </section>
      </div>
    </section>

    <section v-else class="grid h-[calc(100vh-64px)] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="flex min-h-0 flex-col overflow-hidden px-6 py-6">
        <div class="mb-4 rounded-[2px] border-2 border-[#aeb7c4] bg-white px-5 py-3">
          <div>
            <p class="text-xs font-normal uppercase tracking-[0.18em] text-[#667085]">Active Assessment</p>
            <p class="mt-1 text-sm font-bold text-[#101828]">{{ quizTitle }}</p>
          </div>
        </div>

        <article v-if="currentQuestion" class="flex-1 overflow-auto rounded-[2px] border-2 border-[#aeb7c4] bg-white">
          <div class="border-b-2 border-[#c6ced9] px-6 py-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#475467]">Question {{ currentIndex + 1 }} of {{ quiz.questions.length }}</p>
                <p class="mt-1 text-sm font-normal text-[#667085]">{{ activeSectionName }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-[2px] border-2 px-3 py-1 text-xs font-black transition"
                  :class="flaggedQuestions[currentQuestion.id] ? 'border-[#b45309] bg-[#fffbeb] text-[#92400e]' : 'border-[#aeb7c4] bg-white text-[#475467] hover:bg-[#f8fafc]'"
                  @click="toggleFlag(currentQuestion.id)"
                >
                  {{ flaggedQuestions[currentQuestion.id] ? 'Flagged' : 'Flag for review' }}
                </button>
                <p class="rounded-[2px] bg-[#e7ebf0] px-3 py-1 text-xs font-black text-[#1f2937]">
                  {{ selectedOptions[currentQuestion.id] ? 'Response saved' : 'No response' }}
                </p>
              </div>
            </div>
          </div>

          <div class="px-6 py-6">
            <section v-if="currentQuestion.passage" class="mb-6 rounded-[2px] border-2 border-[#b8c0cc] bg-[#f8fafc]">
              <div class="border-b-2 border-[#c6ced9] px-4 py-3">
                <h2 class="text-sm font-black text-[#101828]">
                  {{ currentQuestion.passage.title || `Reading Passage ${currentQuestion.passage.passageNumber}` }}
                </h2>
              </div>
              <div class="max-h-80 overflow-auto whitespace-pre-wrap px-4 py-4 text-sm leading-8 text-[#344054]">
                {{ currentQuestion.passage.content }}
              </div>
              <div v-if="currentQuestion.passage.assets.length" class="space-y-3 border-t-2 border-[#c6ced9] px-4 py-4">
                <img
                  v-for="asset in currentQuestion.passage.assets.filter((item) => item.type === 'image')"
                  :key="asset.id"
                  :src="normalizeAssetUrl(asset)"
                  class="max-h-[300px] max-w-full rounded-[2px] border-2 border-[#b8c0cc] bg-white object-contain"
                  alt=""
                />
              </div>
            </section>

            <p v-if="displayContext" class="mb-5 text-[1.05rem] font-medium leading-8 text-[#4b5565]">
              {{ displayContext }}
            </p>

            <h2 v-if="displayPrompt" class="mb-6 whitespace-pre-wrap text-[1.05rem] font-semibold leading-8 text-[#101828]">
              {{ displayPrompt }}
            </h2>

            <div v-if="currentQuestion.assets.length" class="mb-6 space-y-4">
              <template v-for="asset in currentQuestion.assets" :key="asset.id">
                <audio v-if="asset.type === 'audio'" controls class="w-full" :src="normalizeAssetUrl(asset)"></audio>
                <img
                  v-else-if="asset.type === 'image'"
                  :src="normalizeAssetUrl(asset)"
                  class="max-h-[300px] max-w-full rounded-[2px] border-2 border-[#b8c0cc] object-contain"
                  alt=""
                />
              <a v-else class="text-sm font-black text-[#1f2937]" :href="normalizeAssetUrl(asset)" target="_blank">
                  Open {{ asset.type }}
                </a>
              </template>
            </div>

            <fieldset class="space-y-3">
              <label
                v-for="option in currentQuestion.options"
                :key="option.id"
                class="flex cursor-pointer items-start gap-4 rounded-[2px] border-2 px-4 py-3 transition"
                :class="selectedOptions[currentQuestion.id] === option.value ? 'border-[#1f2937] bg-[#e7ebf0]' : 'border-[#b8c0cc] bg-white hover:border-[#1f2937]'"
              >
                <input
                  v-model="selectedOptions[currentQuestion.id]"
                  type="radio"
                  class="mt-1 h-4 w-4 accent-[#1f2937]"
                  :name="currentQuestion.id"
                  :value="option.value"
                />
                <span class="flex-1 text-[1.1rem] leading-8 text-[#101828]">
                  <span class="mr-2 font-semibold">{{ option.value }}.</span>{{ option.label }}
                </span>
              </label>
            </fieldset>
          </div>
        </article>

        <div class="mt-4 flex items-center justify-between">
          <button
            type="button"
            class="rounded-[2px] border-2 border-[#aeb7c4] bg-white px-5 py-2.5 text-sm font-black text-[#344054] transition hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentIndex === 0"
            @click="previousQuestion"
          >
            Previous
          </button>
          <button
            type="button"
            class="rounded-[2px] bg-[#1f2937] px-6 py-2.5 text-sm font-black text-white transition hover:bg-[#344054]"
            @click="nextQuestion"
          >
            Next
          </button>
        </div>
      </div>

      <aside class="flex min-h-0 flex-col border-l-2 border-[#aeb7c4] bg-white px-5 py-6">
        <h2 class="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-[#475467]">Question Navigator</h2>

        <div class="mt-4 min-h-0 flex-1 space-y-6 overflow-auto pr-1">
          <section
            v-for="session in navigatorSections"
            :key="session.key"
            class="border-t-2 border-[#d5dbe4] pt-4 first:border-t-0 first:pt-0"
          >
            <button
              type="button"
              class="mb-3 flex w-full items-center justify-between rounded-[2px] border border-transparent px-1 py-1 text-left transition hover:border-[#d5dbe4] hover:bg-[#f8fafc]"
              @click="toggleSessionCollapse(session.key)"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-black uppercase tracking-[0.12em] text-[#344054]">{{ session.label }}</span>
                <span class="text-sm font-black text-[#101828]">{{ sessionAnsweredCount(session) }}/{{ session.questions.length }}</span>
              </div>
              <span class="text-xl font-black leading-none text-[#667085]">{{ isSessionCollapsed(session.key) ? '+' : '-' }}</span>
            </button>

            <div v-if="!isSessionCollapsed(session.key)" class="grid grid-cols-6 gap-1.5">
              <button
                v-for="item in session.questions"
                :key="item.question.id"
                type="button"
                class="relative h-8 rounded-[2px] border-2 text-xs font-black transition"
                :class="[
                  currentIndex === item.index
                    ? 'border-[#111827] bg-[#111827] text-white'
                    : isAnswered(item.question.id)
                      ? 'border-[#0f766e] bg-[#d1fae5] text-[#065f46]'
                      : 'border-[#94a3b8] bg-white text-[#475467]',
                  flaggedQuestions[item.question.id] && currentIndex !== item.index ? 'border-[#b45309] bg-[#fef3c7] text-[#92400e]' : '',
                ]"
                @click="jumpToQuestion(item.index)"
              >
                <span
                  v-if="flaggedQuestions[item.question.id]"
                  class="absolute right-0.5 top-0.5 h-2 w-2 rounded-none bg-[#b45309]"
                ></span>
                {{ item.index + 1 }}
              </button>
            </div>
          </section>
        </div>

        <div class="mt-5 shrink-0 rounded-[2px] border-2 border-[#aeb7c4] bg-[#f8fafc] p-3.5">
          <div class="mb-2 flex items-center justify-between gap-3 text-xs">
            <span class="font-medium text-[#667085]">Answered</span>
            <span class="whitespace-nowrap font-black text-[#101828]">{{ answeredCount }} / {{ quiz.questions.length }}</span>
          </div>
          <div class="mb-2.5 flex items-center justify-between gap-3 text-xs">
            <span class="font-medium text-[#667085]">Flagged</span>
            <span class="whitespace-nowrap font-black text-[#101828]">{{ flaggedCount }}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-[2px] bg-[#d9dee8]">
            <div class="h-full bg-[#2f7d68]" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <div class="mt-4 shrink-0 space-y-2 text-xs text-[#667085]">
          <div class="flex items-center gap-2"><span class="h-3.5 w-3.5 rounded-[2px] border border-[#111827] bg-[#111827]"></span>Current</div>
          <div class="flex items-center gap-2"><span class="h-3.5 w-3.5 rounded-[2px] border border-[#0f766e] bg-[#d1fae5]"></span>Answered</div>
          <div class="flex items-center gap-2"><span class="h-3.5 w-3.5 rounded-[2px] border border-[#b45309] bg-[#fef3c7]"></span>Flagged</div>
          <div class="flex items-center gap-2"><span class="h-3.5 w-3.5 rounded-[2px] border border-[#94a3b8] bg-white"></span>Unanswered</div>
        </div>

        <button
          type="button"
          class="mt-4 shrink-0 w-full rounded-[2px] bg-[#7a1f2b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#651923]"
          @click="finishExam"
        >
          Finish Assessment
        </button>
      </aside>
    </section>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

:root {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

[lang="ja"], .text-2xl, .text-3xl, .text-4xl, .text-5xl {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Helvetica Neue", Arial, Meiryo, sans-serif;
  font-weight: 700;
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

span.underline {
  background: linear-gradient(120deg, rgba(var(--color-primary-500), 0.1) 0%, rgba(var(--color-primary-500), 0.1) 100%);
  background-repeat: no-repeat;
  background-size: 100% 0.4em;
  background-position: 0 88%;
}

::selection {
  background: var(--color-primary-300);
  color: inherit;
}
</style>
