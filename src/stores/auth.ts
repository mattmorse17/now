import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Org, OrgMember } from '@/types'

interface AuthState {
  user: User | null
  session: { access_token: string } | null
  orgs: (OrgMember & { orgs: Org })[]
  currentOrg: Org | null
  currentMembership: OrgMember | null
  loading: boolean
  initialized: boolean

  init: () => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  setCurrentOrg: (orgId: string) => void
  updateUser: (updates: Partial<User>) => Promise<void>
  refreshOrgs: () => Promise<void>
}

async function loadUserData(userId: string) {
  const [{ data: user }, { data: memberships }] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('org_members').select('*, orgs(*)').eq('user_id', userId),
  ])
  const orgs = (memberships || []) as (OrgMember & { orgs: Org })[]
  const lastOrgId = localStorage.getItem('now_current_org')
  const currentMembership = orgs.find(m => m.org_id === lastOrgId) || orgs[0] || null
  return { user, orgs, currentMembership }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  orgs: [],
  currentOrg: null,
  currentMembership: null,
  loading: false,
  initialized: false,

  init: async () => {
    // Set up auth state listener first
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, session: null, orgs: [], currentOrg: null, currentMembership: null })
      } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        try {
          const { user, orgs, currentMembership } = await loadUserData(session.user.id)
          set({
            user,
            session: { access_token: session.access_token },
            orgs,
            currentOrg: currentMembership?.orgs || null,
            currentMembership,
            initialized: true,
          })
        } catch {
          set({ initialized: true })
        }
      }
    })

    // Also check existing session on startup
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      set({ initialized: true })
    }
    // If session exists, onAuthStateChange INITIAL_SESSION will fire and handle it
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    set({ loading: false })
    if (error) throw error
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) throw error

    // Load user data directly from the sign-in response (don't rely on listener timing)
    try {
      const { user, orgs, currentMembership } = await loadUserData(data.user.id)
      set({
        user,
        session: { access_token: data.session.access_token },
        orgs,
        currentOrg: currentMembership?.orgs || null,
        currentMembership,
      })
    } catch (e) {
      console.error('Failed to load user data after sign in:', e)
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('now_current_org')
    set({ user: null, session: null, orgs: [], currentOrg: null, currentMembership: null })
  },

  setCurrentOrg: (orgId) => {
    const membership = get().orgs.find(m => m.org_id === orgId)
    if (membership) {
      localStorage.setItem('now_current_org', orgId)
      set({ currentOrg: membership.orgs, currentMembership: membership })
    }
  },

  updateUser: async (updates) => {
    const userId = get().user?.id
    if (!userId) return
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    set({ user: data })
  },

  refreshOrgs: async () => {
    const userId = get().user?.id
    if (!userId) return
    const { data } = await supabase
      .from('org_members')
      .select('*, orgs(*)')
      .eq('user_id', userId)
    const orgs = (data || []) as (OrgMember & { orgs: Org })[]
    set({ orgs })
  },
}))
