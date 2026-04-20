<script setup>
import { computed } from 'vue'
import { examStore } from '../store/exam.js'

const props = defineProps({
  question: Object,
  index: Number,
  uiSize: {
    type: String,
    default: 'medium'
  }
})

// N5 Dokkai Kanji Map for Hover Tooltip
const furiganaMap = {
  "山口先生": "やまぐちせんせい", "中川先生": "なかがわせんせい", "北山花子": "きたやまはなこ",
  "日本語": "にほんご", "来週": "らいしゅう", "今月": "こんげつ", "東京": "とうきょう",
  "中川": "なかがわ", "電話": "でんわ", "本田": "ほんだ", "北山": "きたやま",
  "会社": "かいしゃ", "本屋": "ほんや", "学生": "がくせい", "学校": "がっこう",
  "外国": "がいこく", "月前": "げつまえ", "山口": "やまぐち", "電車": "でんしゃ",
  "質問": "しつもん", "時間": "じかん", "日本": "にほん", "二人": "ふたり",
  "山下": "やました", "田中": "たなか", "今日": "きょう", "山田": "やまだ",
  "先生": "せんせい",
  "弟": "おとうと", "妹": "いもうと", "出": "で", "右": "みぎ", 
  "見": "み", "行": "い", "来": "き", "駅": "えき", "円": "えん", 
  "母": "はは", "父": "ちち", "子": "こ", "食": "た", "手": "て", 
  "雪": "ゆき", "川": "かわ", "小": "ちい", "魚": "さかな", "兄": "あに", 
  "作": "つく", "読": "よ", "何": "なに", "話": "はな", "店": "みせ", 
  "人": "ひと", "本": "ほん", "買": "か", "少": "すこ", "書": "か", 
  "前": "まえ", "屋": "や", "国": "くに", "今": "いま", "安": "やす", 
  "大": "おお", "売": "う", "多": "おお", "友": "とも", "物": "もの", 
  "姉": "あね", "一": "ひと", "二": "ふた", "森": "もり", "机": "つくえ", 
  "上": "うえ", "使": "つか", "枚": "まい", "南": "みなみ", "夜": "よる", 
  "帰": "かえ", "家": "いえ", "近": "ちか", "外": "そと", "雨": "あめ", 
  "中": "なか", "言": "い", "聞": "き", "金": "かね", "着": "つ", 
  "入": "い", "月": "げつ", "火": "か", "水": "すい", "木": "もく", 
  "土": "ど", "同": "おな", "日": "ひ"
}

// Create a regex to match the longest words first
const kanjiRegex = new RegExp(`(${Object.keys(furiganaMap).join('|')})`, 'g')

const renderText = (text) => {
  if (!text) return ''
  
  let result = text
  
  // Highlight Target Word (Underline)
  const target = props.question.Target_Word
  if (target && target !== '-') {
    const targetRegex = new RegExp(`(${target})`, 'g')
    result = result.replace(targetRegex, '<span class="text-primary-700 dark:text-primary-300 underline decoration-primary-400 decoration-2 underline-offset-4">$1</span>')
  }

  // Furigana Hover (Only in Dokkai section, index >= 33)
  if (props.index >= 33) {
    result = result.replace(kanjiRegex, (match) => {
      // Don't mess with HTML attributes if target word was already wrapped
      if (match.includes('span')) return match; 
      
      const reading = furiganaMap[match]
      return `<span class="relative group inline-block cursor-help text-primary-700 bg-primary-100/50 dark:bg-primary-900/30 px-1 rounded-md dark:text-primary-300 font-bold border-b-2 border-dashed border-primary-400 dark:border-primary-500">
                ${match}
                <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-primary-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                  ${reading}
                  <svg class="absolute text-primary-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon class="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                </span>
              </span>`
    })
  }

  return result
}

const highlightedQuestion = computed(() => renderText(props.question.Question))
const optionsHtml = computed(() => {
  return [1, 2, 3, 4].map(n => renderText(props.question[`Option_${n}`]))
})

const isSelected = (n) => examStore.userAnswers[props.index] === n
</script>

<template>
  <div class="bg-white dark:bg-[#16161c] rounded-md border-2 border-primary-100 dark:border-primary-900/30 shadow-xl shadow-primary-200/20 dark:shadow-none w-full transition-all duration-300"
       :class="uiSize === 'small' ? 'p-6 md:p-8' : 'p-8 md:p-12'">
    
    <div class="flex items-center gap-3 mb-4">
      <span class="bg-primary-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors duration-300">Question {{ index < 33 ? index + 1 : index - 33 + 1 }}</span>
      <div class="flex-1 h-px bg-primary-100 dark:bg-primary-900/30 transition-colors duration-300"></div>
    </div>

    <p class="text-primary-500 dark:text-primary-400/50 font-bold mb-4 uppercase tracking-wider transition-colors duration-300"
       :class="uiSize === 'small' ? 'text-[10px]' : 'text-xs'">
      {{ question.Instruction }}
    </p>

    <!-- Japanese Text -->
    <div class="font-bold leading-[1.8] mb-8 text-primary-950 dark:text-white transition-all duration-300" 
         :class="uiSize === 'small' ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'"
         v-html="highlightedQuestion">
    </div>

    <div v-if="question.Gambar !== '-'" class="mb-8 rounded-xl overflow-hidden bg-primary-50 dark:bg-primary-950/20 border-2 border-primary-100 dark:border-primary-900/20 flex justify-center transition-colors duration-300">
      <img :src="question.Gambar" class="max-w-full h-auto max-h-64 object-contain p-4" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button v-for="(n, displayIdx) in (examStore.optionOrders[index] || [1, 2, 3, 4])" :key="n"
        @click="examStore.selectOption(n)"
        class="group flex items-center gap-3 rounded-xl border-2 transition-all text-left"
        :class="[
          uiSize === 'small' ? 'p-3' : 'p-4',
          isSelected(n) 
            ? 'border-primary-600 bg-primary-50 dark:bg-primary-600/20' 
            : 'border-primary-100 dark:border-primary-900/30 hover:border-primary-300 dark:hover:border-primary-700 bg-transparent'
        ]"
      >
        <span class="flex items-center justify-center rounded-lg border-2 shrink-0 font-black transition-all"
          :class="[
            uiSize === 'small' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm',
            isSelected(n) ? 'bg-primary-600 border-primary-600 text-white' : 'border-primary-200 dark:border-primary-800 text-primary-400 dark:text-primary-600'
          ]"
        >{{ displayIdx + 1 }}</span>
        <span class="font-bold" 
              :class="[
                uiSize === 'small' ? 'text-sm md:text-base' : 'text-base md:text-lg',
                isSelected(n) ? 'text-primary-900 dark:text-white' : 'text-primary-800 dark:text-primary-200'
              ]" 
              v-html="optionsHtml[n-1]">
        </span>
      </button>
    </div>
  </div>
</template>
