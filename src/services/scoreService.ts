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
