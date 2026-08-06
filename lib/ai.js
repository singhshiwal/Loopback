const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Prompt version: v1.0 — July 2026
// Validated in Phase 0 against 20 synthetic B2B SaaS tickets
const SYSTEM_PROMPT = `You are a product intelligence analyst. Read customer support tickets and extract structured product intelligence for a product manager.

STRICT RULES:
1. ONLY reference content explicitly present in the provided tickets. Do not extrapolate beyond what is stated.
2. Supporting quotes must be EXACT phrases taken directly from ticket descriptions. Never paraphrase.
3. ticket_count must reflect the actual number of tickets relating to that theme.
4. Output ONLY valid JSON. No preamble, no explanation, no markdown. Just the raw JSON object.
5. severity: "low" = minor inconvenience, "medium" = workflow disruption, "high" = revenue/churn risk or blocker.

OUTPUT SCHEMA (return exactly this structure, nothing else):
{
  "pain_point": {
    "theme": "descriptive theme (max 8 words)",
    "ticket_count": <integer>,
    "severity": "low|medium|high",
    "supporting_quotes": ["exact quote 1", "exact quote 2"]
  },
  "feature_request": {
    "theme": "descriptive theme (max 8 words)",
    "ticket_count": <integer>,
    "severity": "low|medium|high",
    "supporting_quotes": ["exact quote 1", "exact quote 2"]
  },
  "churn_signal": {
    "theme": "descriptive theme (max 8 words)",
    "ticket_count": <integer>,
    "severity": "low|medium|high",
    "supporting_quotes": ["exact quote 1", "exact quote 2"]
  }
}`

/**
 * Format raw ticket rows into the prompt input string
 * @param {Array} tickets - array of ticket objects from Supabase
 * @returns {string} formatted ticket text for the prompt
 */
export function formatTicketsForPrompt(tickets) {
  return tickets
    .map(t =>
      `[${t.external_id || t.id}] Priority: ${(t.priority || 'medium').toUpperCase()}\nSubject: ${t.subject}\nDescription: ${t.description}\nTags: ${t.tags || ''}`
    )
    .join('\n\n---\n\n')
}

/**
 * Run AI synthesis on a batch of tickets using Gemini
 * @param {Array} tickets - array of ticket objects
 * @returns {Object} parsed digest result { pain_point, feature_request, churn_signal }
 */
export async function synthesiseTickets(tickets) {
  if (!tickets || tickets.length === 0) {
    throw new Error('No tickets provided for synthesis')
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const ticketText = formatTicketsForPrompt(tickets)

  const userPrompt = `Here are this week's support tickets. Analyse them and return the JSON output as specified.\n\nTICKETS:\n${ticketText}\n\nOutput ONLY the JSON object. No explanation. No markdown. Just valid JSON starting with { and ending with }.`

  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${errBody.substring(0, 300)}`)
  }

  const data = await res.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!rawText) {
    throw new Error(`Gemini returned no content. Raw response: ${JSON.stringify(data).substring(0, 300)}`)
  }

  let result
  try {
    result = JSON.parse(rawText)
  } catch (e) {
    throw new Error(`AI returned invalid JSON: ${e.message}. Raw output: ${rawText.substring(0, 200)}`)
  }

  // Validate schema
  const requiredKeys = ['pain_point', 'feature_request', 'churn_signal']
  for (const key of requiredKeys) {
    if (!result[key]) throw new Error(`Missing required key in AI output: ${key}`)
    if (!result[key].theme) throw new Error(`Missing theme in ${key}`)
    if (!result[key].supporting_quotes || result[key].supporting_quotes.length < 1) {
      throw new Error(`Missing supporting quotes in ${key}`)
    }
  }

  return {
    result,
    usage: data.usageMetadata || null,
    promptVersion: 'v1.0',
  }
}
