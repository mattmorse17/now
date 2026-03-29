import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { createPortalSession } from '@/lib/stripe'
import { Button, Input, Card, Badge } from '@/components/ui'
import { PRICING_TIERS } from '@/types'
import type { SubscriptionTier } from '@/types'
import { Settings, CreditCard, Webhook, LogOut } from 'lucide-react'

export function AdminSettings() {
  const { currentOrg, signOut, user } = useAuthStore()
  const [zapierUrl, setZapierUrl] = useState(currentOrg?.zapier_webhook_url || '')
  const [saving, setSaving] = useState(false)

  if (!currentOrg) return null

  const tier = PRICING_TIERS[currentOrg.subscription_tier]

  const saveZapier = async () => {
    setSaving(true)
    await supabase.from('orgs').update({ zapier_webhook_url: zapierUrl }).eq('id', currentOrg.id)
    setSaving(false)
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <h1 className="text-heading font-medium">Settings</h1>

      {/* Plan */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-body font-medium">Plan</p>
            <p className="text-caption text-now-text-secondary">{tier.name} — ${tier.price}/mo</p>
          </div>
          <Badge>{currentOrg.subscription_tier}</Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={() => {
          if (currentOrg.stripe_customer_id) createPortalSession(currentOrg.stripe_customer_id)
        }}>
          <CreditCard size={14} /> Manage billing
        </Button>
      </Card>

      {/* Member pricing */}
      {currentOrg.member_access_mode !== 'free' && (
        <Card>
          <p className="text-body font-medium mb-1">Member pricing</p>
          <p className="text-caption text-now-text-secondary mb-3">
            {currentOrg.member_access_mode === 'paid' ? 'Members pay to join' : 'Free + paid tiers'}
          </p>
          <p className="text-heading font-medium">
            ${(currentOrg.member_price_cents / 100).toFixed(0)}<span className="text-caption text-now-text-tertiary">/mo per member</span>
          </p>
          <p className="text-micro text-now-text-tertiary mt-1">Now takes 10% revenue share</p>
        </Card>
      )}

      {/* Zapier */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Webhook size={16} className="text-now-text-secondary" />
          <p className="text-body font-medium">Zapier Webhook</p>
        </div>
        <Input
          placeholder="https://hooks.zapier.com/..."
          value={zapierUrl}
          onChange={e => setZapierUrl(e.target.value)}
        />
        <Button variant="secondary" size="sm" onClick={saveZapier} loading={saving} className="mt-3">
          Save webhook
        </Button>
      </Card>

      {/* Invite link */}
      <Card>
        <p className="text-body font-medium mb-1">Invite link</p>
        <p className="text-caption text-now-text-secondary break-all">
          {window.location.origin}/join/{currentOrg.slug}
        </p>
      </Card>

      {/* Sign out */}
      <Button variant="ghost" size="md" onClick={signOut} className="text-now-text-secondary">
        <LogOut size={16} /> Sign out
      </Button>
    </div>
  )
}
