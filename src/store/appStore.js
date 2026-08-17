import { create } from 'zustand'
import { supabase, fetchOrCreateAgent } from '../lib/supabase'
import { syncFromCloud, syncToCloud, startSyncListener } from '../lib/sync'
import { isDevAuthBypass, getDevSession, getDevAgent } from '../lib/devAuth'
import { disablePushForThisDevice } from '../lib/push'

export const useAppStore = create((set, get) => ({
  // ─── Auth ──────────────────────────────────────────────────────────────────
  session: null,
  agent: null,
  authLoading: true,

  setSession: (session) => set({ session }),
  setAgent: (agent) => set({ agent }),

  // ─── Connectivity ──────────────────────────────────────────────────────────
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: null,

  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),

  // ─── Initialise app ────────────────────────────────────────────────────────
  init: async () => {
    if (isDevAuthBypass()) {
      set({ session: getDevSession(), agent: getDevAgent(), authLoading: false })
      window.addEventListener('online',  () => set({ isOnline: true  }))
      window.addEventListener('offline', () => set({ isOnline: false }))
      startSyncListener()
      return
    }

    // Check for existing session FIRST before setting up the listener
    // This prevents the authLoading flash on page reload
    const { data: { session: existingSession } } = await supabase.auth.getSession()

    if (existingSession) {
      set({ session: existingSession, authLoading: false })
      fetchOrCreateAgent(existingSession.user)
        .then(agent => { if (agent) set({ agent }) })
        .catch(err => console.warn('[Auth] Agent profile:', err.message))
    } else {
      set({ authLoading: false })
    }

    // Then set up the listener for future auth changes (login / logout)
    supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore the INITIAL_SESSION event - already handled above
      if (event === 'INITIAL_SESSION') return

      set({ session, authLoading: false })

      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          const agent = await fetchOrCreateAgent(session.user)
          if (agent) set({ agent })
        } catch (err) {
          console.warn('[Auth] Agent profile:', err.message)
        }

        // Pull latest data from cloud into local DB
        if (navigator.onLine) {
          await syncFromCloud(session.user.id)
          set({ lastSyncAt: new Date().toISOString() })
        }
      }

      if (event === 'SIGNED_OUT') {
        set({ agent: null })
        disablePushForThisDevice()
      }
    })

    // Listen for connectivity changes
    window.addEventListener('online',  () => set({ isOnline: true  }))
    window.addEventListener('offline', () => set({ isOnline: false }))

    // Start background sync listener
    startSyncListener()
  },

  // ─── Manual sync ───────────────────────────────────────────────────────────
  triggerSync: async () => {
    set({ isSyncing: true })
    try {
      await syncToCloud()
      const { session } = get()
      if (session) await syncFromCloud(session.user.id)
      set({ lastSyncAt: new Date().toISOString() })
    } finally {
      set({ isSyncing: false })
    }
  },
}))
