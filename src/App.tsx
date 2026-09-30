import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { SUITS, SuitId, club } from './data/club'
import { SECTIONS, Ledger } from './sections/Sections'
import { isAdminName, authConfig } from './data/auth'
import { setAdminPassword, verifyAdminPassword } from './services/scoreService'
const World = lazy(() => import('./scenes/World'))
// The full intro plays once per browser session; returning visitors go straight to the table.
const USER_KEY = 'sheepshead-user'
const loadUser = () => { try { return localStorage.getItem(USER_KEY) } catch { return null } }
const PW_KEY = 'sheepshead-admin-pw'
const loadPw = () => { try { return sessionStorage.getItem(PW_KEY) || '' } catch { return '' } }
const seenIntro = () => { try { return sessionStorage.getItem('sheepshead-intro') === '1' } catch { return false } }
const markIntro = () => { try { sessionStorage.setItem('sheepshead-intro', '1') } catch { /* ignore */ } }
export type Phase = 'intro' | 'world' | 'entering' | 'exiting' | 'ledger' | SuitId

const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false } })()
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const seen = () => { try { return localStorage.getItem('sc-intro') === '1' } catch { return false } }

export default function App() {
  const [phase, setPhase] = useState<Phase>(reduced || seenIntro() ? 'world' : 'intro')
  const [hovered, setHovered] = useState<SuitId | null>(null), [title, setTitle] = useState(false)
  const [activeSuit, setActiveSuit] = useState<SuitId | null>(null)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pos = useRef<Record<string, THREE.Vector3>>({})
  const cameraLift = useRef(0), cameraZoom = useRef(0)
  const suit = SUITS.find(s => s.id === phase) ?? (phase === 'entering' || phase === 'exiting' ? SUITS.find(s => s.id === activeSuit) : undefined)
  const [ledgerLeaving, setLedgerLeaving] = useState(false)
  const [user, setUser] = useState<string | null>(loadUser), [signingIn, setSigningIn] = useState(false)
  const [pw, setPw] = useState(() => { const v = loadPw(); setAdminPassword(v); return v })
  const [signErr, setSignErr] = useState(''), [signBusy, setSignBusy] = useState(false)
  const isAdmin = isAdminName(user) && (!authConfig.requirePassword || !!pw)
  const remember = (n: string) => { try { localStorage.setItem(USER_KEY, n) } catch { /* ignore */ } }
  const onSignIn = async (rawName: string, password: string) => {
    const n = rawName.trim().replace(/\s+/g, ' '); if (!n) return
    setSignErr('')
    if (authConfig.requirePassword && password) {
      // A password was typed: only a listed admin with the right password gets in this way.
      if (!isAdminName(n)) return setSignErr('Incorrect name or password.')
      setSignBusy(true)
      try { await verifyAdminPassword(password) } catch (e) { setSignBusy(false); return setSignErr(e instanceof Error ? e.message : 'Could not check the password.') }
      setSignBusy(false); setAdminPassword(password); setPw(password)
      try { sessionStorage.setItem(PW_KEY, password) } catch { /* ignore */ }
    }
    setUser(n); remember(n); setSigningIn(false)
  }
  const signOut = () => { setUser(null); setPw(''); setAdminPassword(''); try { localStorage.removeItem(USER_KEY); sessionStorage.removeItem(PW_KEY) } catch { /* ignore */ } }
  const finishIntro = () => { markIntro(); setPhase('world') }

  useEffect(() => {
    if (phase !== 'intro') return
    const a = setTimeout(() => setTitle(true), 400), b = setTimeout(finishIntro, 9500)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [phase])

  const enter = (id: SuitId) => {
    if (phase !== 'world') return
    if (matchMedia('(pointer:coarse)').matches && hovered !== id) return setHovered(id) // tap once to highlight, twice to enter
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    setActiveSuit(id); (window as any).__enterId = id; setPhase('entering')
    transitionTimer.current = setTimeout(() => { setPhase(id); setHovered(null) }, 520)
  }
  const openLedger = () => { if (phase === 'world' && isAdmin) { setHovered(null); setPhase('ledger') } }
  const home = () => {
    if (phase === 'ledger') {
      if (ledgerLeaving) return
      setLedgerLeaving(true); setHovered(null)
      transitionTimer.current = setTimeout(() => { setPhase('world'); setLedgerLeaving(false) }, 620)
      return
    }
    if (phase === 'world' || phase === 'intro') { setPhase('world'); setHovered(null); return }
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    if (phase === 'entering') { setPhase('world'); setActiveSuit(null); setHovered(null); return }
    setPhase('exiting'); setHovered(null)
    transitionTimer.current = setTimeout(() => { setPhase('world'); setActiveSuit(null) }, 620)
  }
  const lc = useRef('#000')
  const Section = suit ? SECTIONS[suit.id] : null
  const flash = phase === 'entering' ? SUITS.find(s => s.id === (window as any).__enterId)?.color : undefined

  return (
    <main style={{ ['--accent' as string]: suit?.color ?? '#d4af37', ['--glyph' as string]: `'${suit?.glyph ?? ''}'` }}>
      {hasGL ? <Suspense fallback={null}><World phase={phase} hovered={hovered} setHovered={setHovered} onSelect={enter} pos={pos} cameraLift={cameraLift} cameraZoom={cameraZoom} /></Suspense>
        : <div className="fallback">{SUITS.map(s => <button key={s.id} style={{ color: s.color }} onClick={() => { setPhase(s.id) }} aria-label={s.label}>{s.glyph}<small>{s.label}</small></button>)}</div>}
      <div className="fog" /><div className="fog f2" /><div className="vignette" /><div className="grain" />
      <header className="hud"><button onClick={home} aria-label="Home"><span className="brand">{'\u2660'} {club.name}<small>{club.subtitle}</small></span></button>
        {phase === 'ledger' && <><span aria-live="polite">{'\u270E'} Score Ledger</span><button onClick={home}>Back</button></>}
        {suit && <><span aria-live="polite">{suit.glyph} {suit.title}</span><button onClick={home}>Back</button></>}</header>
      {phase === 'world' && <div className="auth-bar">
        {user ? <><span className="auth-name">{user}</span>{isAdmin && <button onClick={openLedger}>{'\u270E'} Score Ledger</button>}<button onClick={signOut}>Sign out</button></>
          : <button onClick={() => { setSignErr(''); setSigningIn(true) }}>Sign in</button>}
      </div>}
      {phase === 'world' && signingIn && <div className="signin-overlay" role="dialog" aria-label="Sign in" onClick={() => setSigningIn(false)}>
        <form className="signin-card" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); onSignIn(String(f.get('name') ?? ''), String(f.get('password') ?? '')) }}>
          <h3>Welcome</h3><label>Your name<input name="name" autoFocus autoComplete="name" required /></label>
          {authConfig.requirePassword && <label>Admin password (admins only)<input name="password" type="password" autoComplete="current-password" /></label>}
          {signErr && <p className="err" role="alert">{signErr}</p>}
          <div><button type="submit" disabled={signBusy}>{signBusy ? 'Checking\u2026' : 'Continue'}</button><button type="button" onClick={() => setSigningIn(false)}>Cancel</button></div>
        </form></div>}
      {phase === 'world' && <div className="view-controls" role="group" aria-label="Camera controls">
        <button title="Raise camera" aria-label="Raise camera" onClick={() => { cameraLift.current = Math.min(2.2, cameraLift.current + 0.35) }}>{'\u2191'}</button>
        <button title="Lower camera" aria-label="Lower camera" onClick={() => { cameraLift.current = Math.max(-2.2, cameraLift.current - 0.35) }}>{'\u2193'}</button>
        <button title="Zoom out" aria-label="Zoom out" onClick={() => { cameraZoom.current = Math.max(-3, cameraZoom.current - 1) }}>{'\u2212'}</button>
        <button title="Zoom in" aria-label="Zoom in" onClick={() => { cameraZoom.current = Math.min(5, cameraZoom.current + 1) }}>{'+'}</button>
      </div>}
      {phase === 'intro' && <div className="intro"><h1 className={title ? 'show' : ''}>{club.name}<small>{club.subtitle}</small></h1><button onClick={finishIntro}>Skip intro</button></div>}
      {phase === 'world' && !hovered && <p className="hint">Swipe cards to spin suits. Drag outside to orbit and raise/lower the view. Use controls or Ctrl+wheel to zoom.</p>}
      <div className={`flash${flash ? ' on' : ''}`} style={{ background: (flash && (lc.current = flash), lc.current) }} />
      {phase === 'ledger' && isAdmin && <section className={`panel panel--ledger${ledgerLeaving ? ' panel--leaving' : ''}`} aria-label="Score Ledger"><h2>Score Ledger</h2><Ledger /></section>}
      {Section && suit && phase !== 'entering' && <section className={`panel panel--${suit.id}${phase === 'exiting' ? ' panel--leaving' : ''}`} aria-label={suit.title}><h2>{suit.title}</h2><Section /></section>}
    </main>
  )
}
