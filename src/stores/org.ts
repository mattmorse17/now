import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Content, Session, Notification, OrgMember, MemberProgress } from '@/types'

interface OrgStore {
  content: Content[]
  sessions: Session[]
  members: (OrgMember & { users: { full_name: string; email: string; avatar_url: string | null } })[]
  memberProgress: MemberProgress[]
  notifications: Notification[]
  loading: boolean

  fetchContent: (orgId: string) => Promise<void>
  fetchSessions: (orgId: string) => Promise<void>
  fetchMembers: (orgId: string) => Promise<void>
  fetchMemberProgress: (orgId: string) => Promise<void>
  fetchNotifications: (orgId: string) => Promise<void>
  addContent: (content: Partial<Content>) => Promise<Content>
  createSession: (session: Partial<Session>) => Promise<Session>
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>
}

export const useOrgStore = create<OrgStore>((set, get) => ({
  content: [],
  sessions: [],
  members: [],
  memberProgress: [],
  notifications: [],
  loading: false,

  fetchContent: async (orgId) => {
    const { data } = await supabase
      .from('content')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    set({ content: data || [] })
  },

  fetchSessions: async (orgId) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    set({ sessions: data || [] })
  },

  fetchMembers: async (orgId) => {
    const { data } = await supabase
      .from('org_members')
      .select('*, users(full_name, email, avatar_url)')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: false })
    set({ members: (data as any) || [] })
  },

  fetchMemberProgress: async (orgId) => {
    const { data } = await supabase
      .from('member_progress')
      .select('*')
      .eq('org_id', orgId)
    set({ memberProgress: data || [] })
  },

  fetchNotifications: async (orgId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100)
    set({ notifications: data || [] })
  },

  addContent: async (content) => {
    const { data, error } = await supabase
      .from('content')
      .insert(content)
      .select()
      .single()
    if (error) throw error
    set({ content: [data, ...get().content] })
    return data
  },

  createSession: async (session) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single()
    if (error) throw error
    set({ sessions: [data, ...get().sessions] })
    return data
  },

  updateSession: async (id, updates) => {
    const { error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    set({
      sessions: get().sessions.map(s => s.id === id ? { ...s, ...updates } : s),
    })
  },
}))
