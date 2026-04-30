import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const isLoading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const accessToken = computed(() => session.value?.access_token || null)
  const discordUsername = computed(() => user.value?.user_metadata?.full_name || user.value?.user_metadata?.name || null)
  const discordAvatar = computed(() => user.value?.user_metadata?.avatar_url || null)

  async function init() {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      session.value = currentSession
      user.value = currentSession?.user ?? null
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      isLoading.value = false
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  async function signInWithDiscord() {
    const redirectUrl = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: redirectUrl,
      },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
  }

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    accessToken,
    discordUsername,
    discordAvatar,
    init,
    signInWithDiscord,
    signOut,
  }
})
