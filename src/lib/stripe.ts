import { loadStripe, type Stripe } from '@stripe/stripe-js'
import type { SubscriptionTier, MemberAccessMode } from '@/types'
import { PRICING_TIERS, PLATFORM_REVENUE_SHARE } from '@/types'

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
  }
  return stripePromise
}

// Admin subscription checkout
export async function createAdminCheckout(orgId: string, tier: SubscriptionTier) {
  const price = PRICING_TIERS[tier].price
  const res = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId, tier, priceAmount: price * 100 }),
  })
  const { url } = await res.json()
  if (url) window.location.href = url
}

// Member payment checkout (admin-set price, Now takes 10%)
export async function createMemberCheckout(params: {
  orgId: string
  userId: string
  orgName: string
  priceInCents: number
  accessMode: MemberAccessMode
}) {
  const platformFee = Math.round(params.priceInCents * PLATFORM_REVENUE_SHARE)
  const res = await fetch('/api/stripe/create-member-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      platformFeeCents: platformFee,
    }),
  })
  const { url } = await res.json()
  if (url) window.location.href = url
}

export async function createPortalSession(customerId: string) {
  const res = await fetch('/api/stripe/create-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
  })
  const { url } = await res.json()
  window.location.href = url
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function calculateRevenue(memberCount: number, priceInCents: number) {
  const gross = memberCount * priceInCents
  const platformFee = Math.round(gross * PLATFORM_REVENUE_SHARE)
  return {
    gross,
    platformFee,
    net: gross - platformFee,
  }
}
