export interface ScoreSubmission { name: string; score: number | null; email: string }
export interface SubmitResult { ok: true }

const endpoint = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_SCORE_SHEETS_ENDPOINT
interface SubmissionStatus { ok?: boolean; pending?: boolean; error?: string }

export function submitScore(submission: ScoreSubmission): Promise<SubmitResult> {
  if (!endpoint) return Promise.reject(new Error('Score submission is not connected yet. Configure the Google Sheets endpoint.'))

  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const frameName = `score-submit-${requestId}`
    const frame = document.createElement('iframe')
    const form = document.createElement('form')
    const payload = document.createElement('input')
    let timeout: ReturnType<typeof setTimeout>
    let pollTimer: ReturnType<typeof setTimeout>
    let script: HTMLScriptElement | null = null
    let finished = false
    let pollCount = 0
    const callbackName = `__scoreStatus_${requestId.replace(/[^a-zA-Z0-9_$]/g, '')}`

    frame.name = frameName
    frame.title = 'Score submission'
    frame.hidden = true
    form.method = 'POST'
    form.action = endpoint
    form.target = frameName
    form.hidden = true
    payload.type = 'hidden'
    payload.name = 'payload'
    payload.value = JSON.stringify({ ...submission, requestId })
    form.append(payload)

    const cleanup = () => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      clearTimeout(pollTimer)
      delete (window as unknown as Record<string, unknown>)[callbackName]
      script?.remove()
      form.remove()
      frame.remove()
    }
    const finish = (status: SubmissionStatus) => {
      if (status.pending) {
        pollTimer = setTimeout(pollStatus, 700)
        return
      }
      cleanup()
      if (status.ok) resolve({ ok: true })
      else reject(new Error(status.error || 'The spreadsheet rejected this entry.'))
    }
    const pollStatus = () => {
      if (finished) return
      if (pollCount++ >= 24) {
        cleanup()
        reject(new Error('The spreadsheet did not confirm the submission. Check the sheet before retrying to avoid a duplicate.'))
        return
      }
      if (script) script.remove()
      script = document.createElement('script')
      const url = new URL(endpoint)
      url.searchParams.set('requestId', requestId)
      url.searchParams.set('callback', callbackName)
      script.src = url.toString()
      script.onerror = () => { if (!finished) pollTimer = setTimeout(pollStatus, 700) }
      document.head.append(script)
    }

    timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Could not confirm the spreadsheet submission. Check the sheet before retrying to avoid a duplicate.'))
    }, 24000)
    ;(window as unknown as Record<string, unknown>)[callbackName] = (status: SubmissionStatus) => finish(status)

    document.body.append(frame, form)
    form.submit()
    pollTimer = setTimeout(pollStatus, 700)
  })
}


export interface Standing { name: string; total: number }
const fallbackStandings: Standing[] = []

const csvUrl = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_STANDINGS_CSV_URL
let freshUntil = 0 // after a submission the published CSV lags a little, so read the script directly for a while

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur); return out
}

/** Fast path: the published "Standings" tab, served straight from Google's CDN (no script start-up). */
async function fetchStandingsCsv(): Promise<Standing[]> {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${csvUrl}${csvUrl!.includes('?') ? '&' : '?'}_=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error('Standings CSV unavailable.')
    const lines = (await res.text()).split(/\r?\n/).filter(l => l.trim())
    const list = lines.slice(1).map(parseCsvLine).map(c => ({ name: (c[0] ?? '').trim(), total: Number(c[1]) || 0 })).filter(p => p.name)
    if (!lines.length || !/name/i.test(lines[0])) throw new Error('Unexpected standings format.')
    return list
  } finally { clearTimeout(t) }
}

/** Slow path (fallback / right after a submission): the Apps Script endpoint via JSONP. */
function fetchStandingsScript(): Promise<Standing[]> {
  if (!endpoint) return Promise.resolve(fallbackStandings)
  return new Promise((resolve, reject) => {
    const cb = `__standings_${Date.now()}_${Math.random().toString(16).slice(2)}`.replace(/[^a-zA-Z0-9_$]/g, '')
    const script = document.createElement('script')
    const w = window as unknown as Record<string, unknown>
    const done = () => { clearTimeout(t); delete w[cb]; script.remove() }
    const t = setTimeout(() => { done(); reject(new Error('Standings request timed out.')) }, 15000)
    w[cb] = (r: { ok?: boolean; players?: Standing[]; error?: string }) => {
      done()
      if (r && r.ok && Array.isArray(r.players)) resolve(r.players.map(p => ({ name: String(p.name), total: Number(p.total) || 0 })))
      else reject(new Error(r?.error || 'Could not read the standings.'))
    }
    const url = new URL(endpoint)
    url.searchParams.set('action', 'standings')
    url.searchParams.set('callback', cb)
    script.src = url.toString()
    script.onerror = () => { done(); reject(new Error('Could not reach the spreadsheet.')) }
    document.head.append(script)
  })
}

export function fetchStandings(): Promise<Standing[]> {
  if (csvUrl && Date.now() > freshUntil) return fetchStandingsCsv().catch(() => fetchStandingsScript())
  return fetchStandingsScript()
}
/** Call after a score is submitted so the next reads bypass the (slightly delayed) published CSV. */
export function markSheetChanged() { freshUntil = Date.now() + 6 * 60 * 1000 }

// Shared live store: the ledger dropdown and the top-5 name tags read the same data.
const CACHE_KEY = 'sheepshead-standings-v1'
function readCache(): Standing[] | null {
  try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return Array.isArray(v) ? v : null } catch { return null }
}
// Last known standings show instantly on repeat visits, then get refreshed from the sheet.
let current: Standing[] | null = readCache()
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()
/** One shared request: every caller (top-5 tags, ledger dropdown, prefetch) reuses the same in-flight fetch. */
export function refreshStandings(force = false): Promise<void> {
  if (inflight) return force ? inflight.then(() => refreshStandings(true)) : inflight
  if (current && !force) return Promise.resolve()
  inflight = fetchStandings()
    .then(list => { current = list; try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)) } catch { /* private mode */ } listeners.forEach(l => l()) })
    .catch(() => { /* keep last good data */ })
    .finally(() => { inflight = null })
  return inflight
}
export function subscribeStandings(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export const getStandings = () => current

/** Called once at startup, before React renders, so the sheet loads in parallel with the 3D scene and its assets. */
export function prefetchSheet() {
  if (!endpoint && !csvUrl) return
  try {
    const origins = [csvUrl ? new URL(csvUrl).origin : '', endpoint ? new URL(endpoint).origin : '', endpoint ? 'https://script.googleusercontent.com' : ''].filter(Boolean)
    for (const href of new Set(origins)) {
      const l = document.createElement('link'); l.rel = 'preconnect'; l.href = href; l.crossOrigin = ''; document.head.append(l)
    }
  } catch { /* ignore malformed endpoint */ }
  refreshStandings(true) // revalidate even when cached data is already showing
}

/** Top N by total score; ties broken alphabetically. */
export function topPlayers(list: Standing[], n = 5): Standing[] {
  return [...list].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, n)
}
