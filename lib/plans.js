// Plan definitions. Single source of truth for pricing AND enforcement.
// Every gate in the app (ingest limits, digest channels, dashboard history,
// workspace count, seat count, ingestion sources) reads its numbers from
// here, so plan logic never drifts out of sync across files.
//
// Matches the live pricing page (4 tiers). Zendesk/Intercom/Salesforce/Jira
// are declared here as Team-tier entitlements but are NOT yet built — see
// /areas/loopback.md for what's implemented vs. what's just gated-for-later.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    ticketWindowDays: 7,        // "Last 7 days of tickets"
    ticketsPerRun: 50,          // "Up to 50 tickets/run"
    channels: ['email'],        // "Email digest only"
    digestHistoryWeeks: 0,      // no history dashboard
    trendChart: false,
    maxWorkspaces: 1,
    maxSeats: 1,
    sourcesAllowed: ['csv'],    // no API connection on Free
    features: [
      'CSV upload (any platform)',
      'Last 7 days of tickets',
      'Email digest only',
      'Up to 50 tickets/run',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    interval: 'month',
    ticketWindowDays: 30,
    ticketsPerRun: 200,         // "Up to 200 tickets/week"
    channels: ['email', 'slack'],
    digestHistoryWeeks: 0,      // "no digest history dashboard" per pricing page
    trendChart: false,
    maxWorkspaces: 1,
    maxSeats: 1,
    sourcesAllowed: ['csv', 'freshdesk'],
    features: [
      'Freshdesk API connection',
      'Last 30 days of tickets',
      'Slack + Email digest',
      'Up to 200 tickets/week',
      'CSV upload (any platform)',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'month',
    ticketWindowDays: 30,
    ticketsPerRun: 500,         // "Up to 500 tickets/week"
    channels: ['email', 'slack'],
    digestHistoryWeeks: 8,      // "Digest history (8 weeks)"
    trendChart: true,           // "Ticket volume trend chart"
    maxWorkspaces: 3,           // "Multi-workspace (up to 3)"
    maxSeats: 1,
    sourcesAllowed: ['csv', 'freshdesk'],
    features: [
      'Everything in Starter',
      'Digest history (8 weeks)',
      'Ticket volume trend chart',
      'Multi-workspace (up to 3)',
      'Up to 500 tickets/week',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 199,
    interval: 'month',
    ticketWindowDays: 30,
    ticketsPerRun: 500,
    channels: ['email', 'slack'],
    digestHistoryWeeks: 8,
    trendChart: true,
    maxWorkspaces: 3,
    maxSeats: 5,                // "Team seats (up to 5)"
    sourcesAllowed: ['csv', 'freshdesk', 'zendesk', 'intercom', 'salesforce'],
    jiraIssueCreation: true,
    features: [
      'Everything in Pro',
      'Zendesk + Intercom ingestion',
      'Salesforce Cases ingestion',
      'Jira issue creation',
      'Team seats (up to 5)',
    ],
  },
}

export const PLAN_ORDER = ['free', 'starter', 'pro', 'team']

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free
}
