import { useState, FormEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { socials } from '../data/socials'
import { councilMembers, CouncilMember } from '../data/council'
import { rules } from '../data/rules'
import { submitScore } from '../services/scoreService'
import type { SuitId } from '../data/club'

function Socials() {
  return <div className="grid socials-grid">{socials.map(s => (
    <a key={s.name} className="tile" href={s.url} target="_blank" rel="noreferrer">
      <span className="icon" aria-hidden>{s.icon}</span><h3>{s.name}</h3><p>{s.description}</p>
      <div className="qr">{s.qrCode ? <img src={s.qrCode} alt={`${s.name} QR code`} /> : ['Instagram', 'Discord'].includes(s.name) ? <QRCodeSVG value={s.url} size={180} level="M" marginSize={2} bgColor="#ffffff" fgColor="#111111" aria-label={`${s.name} QR code`} /> : 'QR'}</div>
    </a>))}</div>
}

export function CouncilMemberCard({ m }: { m: CouncilMember }) {
  return <a className="tile council-member" href={`mailto:${m.email}`} aria-label={`Email ${m.name} at ${m.email}`}>
    <h3>{m.name}</h3><em>{m.position}</em><span className="council-email">{m.email}</span>
  </a>
}
const Council = () => <div className="grid">{councilMembers.map((m, i) => <CouncilMemberCard key={i} m={m} />)}</div>

function Rules() {
  const [i, setI] = useState(0), pg = rules[i]
  return <div className="book"><h3>{pg.title}</h3>
    {pg.videoUrl ? <><div className="video-frame"><iframe src={pg.videoUrl} title="Sheepshead rules video tutorial" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div><a className="video-link" href={pg.watchUrl} target="_blank" rel="noreferrer">Open video on YouTube</a></> : <p style={{ whiteSpace: 'pre-line' }}>{pg.body}</p>}
    <nav><button disabled={!i} onClick={() => setI(i - 1)}>Previous</button><span>{i + 1} / {rules.length}</span>
      <button disabled={i === rules.length - 1} onClick={() => setI(i + 1)}>Next</button></nav></div>
}

function Ledger() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle'), [err, setErr] = useState<string[]>([])
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget), v = (k: string) => String(f.get(k) ?? '').trim()
    const errors: string[] = []
    if (!v('name')) errors.push('Enter your first and last name.')
    if (v('score') !== '' && !Number.isFinite(Number(v('score')))) errors.push('Score must be a number.')
    if (v('email') !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errors.push('Enter a valid email address.')
    setErr(errors); if (errors.length) return
    setState('sending')
    try {
      await submitScore({ name: v('name'), score: v('score') === '' ? null : Number(v('score')), email: v('email') })
      setState('done')
    } catch (error) {
      setErr([error instanceof Error ? error.message : 'Could not submit the score. Please try again.'])
      setState('idle')
    }
  }
  if (state === 'done') return <div className="book success"><h3>Score submitted</h3><p>Your entry was added to the spreadsheet.</p><button onClick={() => setState('idle')}>Add another entry</button></div>
  return <form className="ledger" onSubmit={onSubmit} noValidate>
    <label>Name (first and last)<input name="name" autoComplete="name" required /></label>
    <label>Score for Today (net-gain or net-loss)<input name="score" type="number" step="any" /></label>
    <label className="wide">Email (If you're not on the email list already)<input name="email" type="email" autoComplete="email" /></label>
    {err.length > 0 && <ul className="err" role="alert">{err.map(x => <li key={x}>{x}</li>)}</ul>}
    <button className="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Writing\u2026' : 'Submit score'}</button></form>
}

export const SECTIONS: Record<SuitId, () => JSX.Element> = { hearts: Socials, diamonds: Council, spades: Rules, clubs: Ledger }
