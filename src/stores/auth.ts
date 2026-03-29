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

// Build a minimal User object from Supabase auth response (no DB fetch needed)
function userFromAuth(authUser: { id: string; email?: string; user_metadata?: Record<string, any> }): User {
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
    avatar_url: authUser.user_metadata?.avatar_url || null,
    global_profile: { bio: '', goals: [], preferences: {} },
    social_links: { instagram: '', twitter: '', youtube: '', website: '', tiktok: '', linkedin: '' },
    fcm_token: null,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  } as User
}

// Try to load full profile from DB — returns null user if it fails (RLS, network, etc)
async function tryLoadUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
    if (error || !data) return null
    return data as User
  } catch {
    return null
  }
}

async function loadOrgs(userId: string) {
  try {
    const { data } = await supabase.from('org_members').select('*, orgs(*)').eq('user_id', userId)
    return (data || []) as (OrgMember & { orgs: Org })[]
  } catch {
    return []
  }
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
    // Listen for future auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, session: null, orgs: [], currentOrg: null, currentMembership: null })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ session: { access_token: session.access_token } })
      }
    })

    // Load current session
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        set({ initialized: true })
        return
      }

      // Always set a user immediately from auth — never depend on DB fetch for login
      const authUser = userFromAuth(session.user)
      const dbUser = await tryLoadUserProfile(session.user.id)
      const user = dbUser || authUser

      const orgs = await loadOrgs(session.user.id)
      const lastOrgId = localStorage.getItem('now_current_org')
      const currentMembership = orgs.find(m => m.org_id === lastOrgId) || orgs[0] || null

      set({
        user,
        session: { access_token: session.access_token },
        orgs,
        currentOrg: currentMembership?.orgs || null,
        currentMembership,
        initialized: true,
      })
    } catch {
      // Even if everything fails, mark initialized so the app doesn't hang
      set({ initialized: true })
    }
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
    if (error) {
      set({ loading: false })
      throw error
    }

    // ALWAYS set user from auth response immediately — this makes login work
    // regardless of whether the DB profile fetch succeeds
    const authUser = userFromAuth(data.user)
    set({
      user: authUser,
      session: { access_token: data.session.access_token },
      loading: false,
    })

    // Then try to enrich with full DB profile + orgs in the background
    const dbUser = await tryLoadUserProfile(data.user.id)
    if (dbUser) set({ user: dbUser })

    const orgs = await loadOrgs(data.user.id)
    const lastOrgId = localStorage.getItem('now_current_org')
    const currentMembership = orgs.find(m => m.org_id === lastOrgId) || orgs[0] || null
    set({
      orgs,
      currentOrg: currentMembership?.orgs || null,
      currentMembership,
    })
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
    set({ user: data as User })
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
