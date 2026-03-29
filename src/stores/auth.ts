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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  orgs: [],
  currentOrg: null,
  currentMembership: null,
  loading: false,
  initialized: false,

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        set({ initialized: true })
        return
      }

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      const { data: memberships } = await supabase
        .from('org_members')
        .select('*, orgs(*)')
        .eq('user_id', session.user.id)

      const orgs = (memberships || []) as (OrgMember & { orgs: Org })[]

      // Restore last org from localStorage
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

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, orgs: [], currentOrg: null, currentMembership: null })
        } else if (session) {
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          set({ user, session: { access_token: session.access_token } })
        }
      })
    } catch {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) throw error
    await get().init()
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
