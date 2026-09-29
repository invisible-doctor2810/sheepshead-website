import { useEffect, useState, useSyncExternalStore, FormEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { socials } from '../data/socials'
import { councilMembers, CouncilMember } from '../data/council'
import { rules } from '../data/rules'
import { submitScore, refreshStandings, subscribeStandings, getStandings, markSheetChanged } from '../services/scoreService'
import { scoreHistory } from '../data/history'
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

function History() {
  const [i, setI] = useState(0), sem = scoreHistory[i]
  return <div className="book history"><h3>{sem.title}</h3>
    {sem.rows.length
      ? <div className="score-table-wrap"><table className="score-table"><colgroup>{sem.columns.map((c, ci) => <col key={c} className={ci === 0 ? 'col-name' : ci < 3 ? 'col-stat' : undefined} />)}</colgroup><thead><tr>{sem.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{sem.rows.map((r, ri) => <tr key={ri}>{r.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody></table></div>
      : <p>Scores for this semester are being added.</p>}
    <nav><button disabled={!i} onClick={() => setI(i - 1)}>Newer</button><span>{i + 1} / {scoreHistory.length}</span>
      <button disabled={i === scoreHistory.length - 1} onClick={() => setI(i + 1)}>Older</button></nav></div>
}

const NEW_PLAYER = '__new__'
export function Ledger() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle'), [err, setErr] = useState<string[]>([]), [pick, setPick] = useState('')
  const standings = useSyncExternalStore(subscribeStandings, getStandings)
  useEffect(() => { refreshStandings() }, [])
  const names = [...new Set((standings ?? []).map(p => p.name))].sort((a, b) => a.localeCompare(b))
  const isNew = pick === NEW_PLAYER
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget), v = (k: string) => String(f.get(k) ?? '').trim()
    const name = isNew ? v('newName') : pick
    const errors: string[] = []
    if (!name) errors.push(isNew ? 'Enter your first and last name.' : 'Choose your name from the list.')
    if (v('score') !== '' && !Number.isFinite(Number(v('score')))) errors.push('Score must be a number.')
    if (v('email') !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errors.push('Enter a valid email address.')
    setErr(errors); if (errors.length) return
    setState('sending')
    try {
      await submitScore({ name, score: v('score') === '' ? null : Number(v('score')), email: v('email') })
      setState('done'); markSheetChanged(); refreshStandings(true) // names and top-5 tags pick up the new score
    } catch (error) {
      setErr([error instanceof Error ? error.message : 'Could not submit the score. Please try again.'])
      setState('idle')
    }
  }
  if (state === 'done') return <div className="book success"><h3>Score submitted</h3><p>Your entry was added to the spreadsheet.</p><button onClick={() => { setState('idle'); setPick('') }}>Add another entry</button></div>
  return <form className="ledger" onSubmit={onSubmit} noValidate>
    <label className="wide">Name
      <select name="name" value={pick} onChange={e => setPick(e.target.value)} required>
        <option value="" disabled>{standings ? 'Select your name' : 'Loading names\u2026'}</option>
        {names.map(n => <option key={n} value={n}>{n}</option>)}
        <option value={NEW_PLAYER}>My name isn't listed</option>
      </select></label>
    {isNew && <label className="wide">Name (first and last)<input name="newName" autoComplete="name" required /></label>}
    <label>Score for Today (net-gain or net-loss)<input name="score" type="number" step="any" /></label>
    <label>Email (If you're not on the email list already)<input name="email" type="email" autoComplete="email" /></label>
    {err.length > 0 && <ul className="err" role="alert">{err.map(x => <li key={x}>{x}</li>)}</ul>}
    <button className="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Writing\u2026' : 'Submit score'}</button></form>
}

export const SECTIONS: Record<SuitId, () => JSX.Element> = { hearts: Socials, diamonds: Council, spades: Rules, clubs: History }
