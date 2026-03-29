import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { AuthCallback } from '@/pages/auth/AuthCallback'
import { OrgSelectPage } from '@/pages/auth/OrgSelectPage'

// Admin
import { AdminOnboarding } from '@/pages/admin/onboarding/AdminOnboarding'
import { AdminShell } from '@/components/layout/AppShell'
import { AdminDashboard } from '@/pages/admin/dashboard/AdminDashboard'
import { AdminMembers } from '@/pages/admin/dashboard/AdminMembers'
import { AdminContent } from '@/pages/admin/dashboard/AdminContent'
import { AdminSessions } from '@/pages/admin/dashboard/AdminSessions'
import { AdminNotifications } from '@/pages/admin/dashboard/AdminNotifications'
import { AdminSettings } from '@/pages/admin/dashboard/AdminSettings'

// Member
import { MemberOnboarding } from '@/pages/member/onboarding/MemberOnboarding'
import { MemberShell } from '@/components/layout/AppShell'
import { MemberHome } from '@/pages/member/home/MemberHome'
import { AgentChat } from '@/pages/member/home/AgentChat'
import { MemberNotifications } from '@/pages/member/home/MemberNotifications'
import { MemberProfile } from '@/pages/member/home/MemberProfile'

// Shared
import { LiveSession } from '@/pages/member/session/LiveSession'
import { JoinPage } from '@/pages/shared/JoinPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen bg-now-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

function RequireOrg({ children }: { children: React.ReactNode }) {
  const { currentOrg } = useAuthStore()
  if (!currentOrg) return <Navigate to="/orgs" replace />
  return <>{children}</>
}

export default function App() {
  const { init, initialized } = useAuthStore()

  useEffect(() => { init() }, [])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-now-bg flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-white mx-auto flex items-center justify-center">
            <span className="text-black font-bold">N</span>
          </div>
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Join org (can be public-ish) */}
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:slug" element={
          <RequireAuth><MemberOnboarding /></RequireAuth>
        } />

        {/* Org selection */}
        <Route path="/orgs" element={
          <RequireAuth><OrgSelectPage /></RequireAuth>
        } />

        {/* Admin onboarding (creating new org) */}
        <Route path="/admin/onboarding" element={
          <RequireAuth><AdminOnboarding /></RequireAuth>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <RequireAuth><RequireOrg><AdminShell /></RequireOrg></RequireAuth>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="content/upload" element={<AdminContent />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="notifications/new" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Admin live session */}
        <Route path="/admin/sessions/:sessionId/live" element={
          <RequireAuth><RequireOrg><LiveSession /></RequireOrg></RequireAuth>
        } />

        {/* Member routes */}
        <Route path="/home" element={
          <RequireAuth><RequireOrg><MemberShell /></RequireOrg></RequireAuth>
        }>
          <Route index element={<MemberHome />} />
          <Route path="chat" element={<AgentChat />} />
          <Route path="notifications" element={<MemberNotifications />} />
          <Route path="profile" element={<MemberProfile />} />
        </Route>

        {/* Member live session */}
        <Route path="/home/session/:sessionId" element={
          <RequireAuth><RequireOrg><LiveSession /></RequireOrg></RequireAuth>
        } />

        {/* Default redirect */}
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function DefaultRedirect() {
  const { user, orgs, currentOrg, currentMembership } = useAuthStore()

  if (!user) return <Navigate to="/auth/login" replace />
  if (orgs.length === 0) return <Navigate to="/orgs" replace />
  if (!currentOrg) return <Navigate to="/orgs" replace />
  if (currentMembership?.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/home" replace />
}
