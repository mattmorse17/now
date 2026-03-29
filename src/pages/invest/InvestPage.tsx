import { motion } from 'framer-motion'
import { ArrowRight, Zap, Users, TrendingUp, Star, CheckCircle } from 'lucide-react'

const tiers = [
  { range: '$500 – $2,499', perks: ['Founding Investor badge in app', 'Locked-in platform pricing forever'], highlight: false },
  { range: '$2,500 – $9,999', perks: ['Everything above', '+3% bonus shares', 'Quarterly investor updates'], highlight: false },
  { range: '$10,000 – $24,999', perks: ['Everything above', '+5% bonus shares', 'Early access to new features'], highlight: true },
  { range: '$25,000+', perks: ['Everything above', '+7% bonus shares', 'Direct line to founders', 'Advisory board consideration'], highlight: false },
]

const stats = [
  { value: 'Reg CF', label: 'SEC-registered offering' },
  { value: '$500', label: 'Minimum investment' },
  { value: '$5M', label: 'Round target' },
  { value: 'All', label: 'US residents welcome' },
]

const reasons = [
  {
    icon: Zap,
    title: 'You use it every day',
    body: 'Boxabl investors waited years to see their product. AI³ investors use the platform the day they invest. Every session, every personalized notification, every insight compounds your conviction in real time.',
  },
  {
    icon: Users,
    title: 'The people who benefit most should own the most',
    body: 'Coaches, churches, creators, athletes — the communities powering AI³ should share in what they\'re building. This isn\'t a Wall Street round. It\'s a community round.',
  },
  {
    icon: TrendingUp,
    title: 'A documented path to liquidity',
    body: 'Phase 1: Reg CF up to $5M. Phase 2: Reg A+ up to $75M. Phase 3: Series A or Nasdaq listing. Every early investor has a clear documented path forward.',
  },
]

export function InvestPage() {
  return (
    <div className="min-h-screen bg-now-bg text-white">
      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white mx-auto mb-8 flex items-center justify-center">
            <span className="text-black font-bold text-2xl">N</span>
          </div>
          <p className="text-caption text-now-text-tertiary uppercase tracking-widest mb-4">AI³ Inc. — Investor Round</p>
          <h1 className="text-4xl font-medium leading-tight mb-6">
            You're not just using AI³.<br />
            <span className="text-now-text-secondary">You're building it.</span>
          </h1>
          <p className="text-body text-now-text-secondary leading-relaxed mb-10">
            Every personalized notification. Every live session recap. Every moment the platform works exactly for you —
            that's the product you can own a piece of.
          </p>
          <a
            href="https://wefunder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-black font-medium px-8 py-4 rounded-2xl text-body hover:bg-white/90 transition-colors"
          >
            Invest on Wefunder <ArrowRight size={16} />
          </a>
          <p className="text-micro text-now-text-tertiary mt-4">
            SEC Reg CF offering · Any US resident · No accreditation required
          </p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12 border-t border-now-border">
        <div className="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <p className="text-2xl font-medium mb-1">{s.value}</p>
              <p className="text-caption text-now-text-secondary">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why invest */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-heading font-medium mb-10 text-center">Why now. Why this.</h2>
        <div className="space-y-8">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 * i }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-now-surface border border-now-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <r.icon size={18} className="text-now-text-secondary" />
              </div>
              <div>
                <h3 className="text-body font-medium mb-2">{r.title}</h3>
                <p className="text-body text-now-text-secondary leading-relaxed">{r.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Science backing */}
      <section className="px-6 py-12 border-t border-now-border bg-now-surface/30">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-micro text-now-text-tertiary uppercase tracking-widest mb-4">Scientific foundation</p>
          <h2 className="text-heading font-medium mb-4">Neurologically different, not just better UX</h2>
          <p className="text-body text-now-text-secondary leading-relaxed">
            Meta FAIR's TRIBE v2 model (March 2026) proves at a biological level that different content activates
            different brain regions in different individuals. AI³'s personalization approach isn't a UX preference —
            it's neurologically distinct from mass broadcasting. The science is in. The product is live.
            The market is open.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-heading font-medium mb-3 text-center">Founder tiers</h2>
        <p className="text-body text-now-text-secondary text-center mb-10">The earlier you believe, the more you benefit.</p>
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.range}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`rounded-2xl p-5 border ${
                tier.highlight
                  ? 'border-white/30 bg-white/5'
                  : 'border-now-border bg-now-surface'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-body font-medium">{tier.range}</p>
                {tier.highlight && (
                  <span className="flex items-center gap-1 text-micro text-now-text-secondary border border-now-border rounded-full px-2 py-0.5">
                    <Star size={10} fill="currentColor" /> Most popular
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {tier.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-2 text-caption text-now-text-secondary">
                    <CheckCircle size={13} className="text-now-success flex-shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="https://wefunder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-black font-medium px-8 py-4 rounded-2xl text-body hover:bg-white/90 transition-colors"
          >
            Own a piece <ArrowRight size={16} />
          </a>
          <p className="text-micro text-now-text-tertiary mt-4 max-w-sm mx-auto">
            This is not financial advice. Investing in early-stage companies involves risk, including loss of principal.
            See offering circular for full details.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-now-border px-6 py-8 text-center">
        <p className="text-micro text-now-text-tertiary">
          AI³ Inc. · SEC Reg CF Offering · <a href="/" className="hover:text-white transition-colors">Back to app</a>
        </p>
      </footer>
    </div>
  )
}
