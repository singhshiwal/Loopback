// Plan definitions. Single source of truth for pricing, used by the billing
// API routes and the dashboard billing page. When a real gateway is wired up,
// these ids map to the provider's actual price IDs (see lib/billing.js).

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    features: [
      '1 workspace',
      'Manual CSV upload',
      '1 digest per month',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    interval: 'month',
    features: [
      'Freshdesk auto-sync',
      'Weekly digest via Slack + email',
      'Up to 500 tickets/month',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'month',
    features: [
      'Everything in Starter',
      'Unlimited tickets',
      'Priority digest generation',
      'Multiple Slack channels',
    ],
  },
}

export const PLAN_ORDER = ['free', 'starter', 'pro']

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free
}
