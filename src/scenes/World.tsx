import { useRef, useEffect, MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, Html, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SUITS, SuitId } from '../data/club'
import Players from './Players'
import Backdrop from './Backdrop'
import Table from './Table'
import type { Phase } from '../App'

const R = 2.6, damp = THREE.MathUtils.damp
const lowEnd = navigator.hardwareConcurrency < 4 || matchMedia('(pointer:coarse)').matches

interface WorldProps { phase: Phase; hovered: SuitId | null; setHovered: (s: SuitId | null) => void; onSelect: (s: SuitId) => void; pos: MutableRefObject<Record<string, THREE.Vector3>>; cameraLift: MutableRefObject<number>; cameraZoom: MutableRefObject<number> }
type SuitsProps = WorldProps & { tableRotation: MutableRefObject<number> }
function Suits({ phase, hovered, setHovered, onSelect, pos, tableRotation, cameraLift, cameraZoom }: SuitsProps) {
  const groups = useRef<(THREE.Group | null)[]>([]), lights = useRef<(THREE.PointLight | null)[]>([]), mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]), haloMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]), haloGroups = useRef<(THREE.Group | null)[]>([])
  const intro = phase === 'intro'
  const angle = useRef(0), speed = useRef(0), radius = useRef(intro ? 0 : R), cy = useRef(intro ? 1.03 : 1.5), cz = useRef(intro ? 1.6 : 0), flat = useRef(intro ? 1 : 0), hv = useRef(SUITS.map(() => 0))
  const entry = useRef({ id: null as SuitId | null, started: 0 })
  const tmp = useRef(new THREE.Vector3()), dir = useRef(new THREE.Vector3())
  const sw = useRef({ vel: 0, down: false, x: 0, y: 0, moved: 0, ts: 0, mode: 'cards' as 'cards' | 'view' }), click = useRef({ id: null as SuitId | null, started: 0 })
  useEffect(() => {
    const el = document.querySelector('main'), s = sw.current
    if (!el) return
    const inCardBand = (x: number, y: number) => {
      const rect = el.getBoundingClientRect(), nx = (x - rect.left) / rect.width, ny = (y - rect.top) / rect.height
      return nx > 0.12 && nx < 0.88 && ny > 0.24 && ny < 0.82
    }
    const dn = (e: PointerEvent) => { if (phase !== 'world') return; s.down = true; s.x = e.clientX; s.y = e.clientY; s.moved = 0; s.vel = 0; s.ts = e.timeStamp; s.mode = inCardBand(e.clientX, e.clientY) ? 'cards' : 'view' }
    const mv = (e: PointerEvent) => {
      if (!s.down || phase !== 'world') return
      const dx = e.clientX - s.x, dy = e.clientY - s.y, dtm = Math.max(e.timeStamp - s.ts, 8) / 1000
      s.x = e.clientX; s.y = e.clientY; s.ts = e.timeStamp; s.moved += Math.abs(dx) + Math.abs(dy)
      if (s.mode === 'cards') { const da = -(dx + dy * 0.65) * 0.006; angle.current += da; s.vel = THREE.MathUtils.clamp(da / dtm, -8, 8) }
      else {
        tableRotation.current += dx * 0.004
        cameraLift.current = THREE.MathUtils.clamp(cameraLift.current - dy * 0.008, -2.2, 2.2)
      }
    }
    const up = () => { s.down = false }
    const wh = (e: WheelEvent) => {
      if (phase !== 'world') return
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) cameraZoom.current = THREE.MathUtils.clamp(cameraZoom.current + (e.deltaY < 0 ? 1 : -1) * 0.5, -3, 5)
      else if (inCardBand(e.clientX, e.clientY)) s.vel = THREE.MathUtils.clamp(s.vel + (e.deltaX + e.deltaY) * 0.004, -6, 6)
      else tableRotation.current += (e.deltaY + e.deltaX) * 0.0025
    }
    el.addEventListener('pointerdown', dn); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); el.addEventListener('wheel', wh, { passive: false })
    return () => { el.removeEventListener('pointerdown', dn); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); el.removeEventListener('wheel', wh) }
  }, [phase, tableRotation, cameraLift, cameraZoom])
  useEffect(() => { document.body.style.cursor = hovered ? 'pointer' : 'auto' }, [hovered])
  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    const enteringId = phase === 'entering' || phase === 'exiting' ? (window as any).__enterId as SuitId | undefined : undefined
    if (enteringId && entry.current.id !== enteringId) entry.current = { id: enteringId, started: t }
    if (!enteringId) entry.current.id = null
    const spinning = phase === 'intro' || (phase === 'world' && !hovered)
    speed.current = damp(speed.current, spinning ? (phase === 'intro' && t < 2 ? 1.4 : 0.28) : 0, 2.5, dt)
    angle.current += speed.current * dt
    if (!sw.current.down) { angle.current += sw.current.vel * dt; sw.current.vel = damp(sw.current.vel, 0, 2.2, dt) }
    radius.current = damp(radius.current, phase === 'intro' && t < 2 ? 0 : R, 2, dt) // card "splits" at t=2s
    const early = phase === 'intro' && t < 2 // card starts lying on the felt, lifts, spins, then splits
    cy.current = damp(cy.current, early ? (t < 1 ? 1.03 : 1.9) : 1.5, 3, dt); cz.current = damp(cz.current, early ? 1.6 : 0, 2, dt); flat.current = damp(flat.current, phase === 'intro' && t < 1 ? 1 : 0, 4, dt)
    SUITS.forEach((s, i) => {
      const g = groups.current[i]; if (!g) return
      const a = angle.current + (i * Math.PI) / 2
      hv.current[i] = damp(hv.current[i], hovered === s.id ? 1 : 0, 6, dt)
      const h = hv.current[i]
      const clickAge = click.current.id === s.id ? (performance.now() - click.current.started) / 720 : 1
      const pulse = clickAge < 1 ? Math.sin(clickAge * Math.PI) : 0
      const k = Math.min(1, (radius.current / R) * 1.5)
      tmp.current.set(Math.cos(a) * radius.current, cy.current + Math.sin(t * 0.9 + i) * 0.12 * k + (1 - k) * i * 0.004, Math.sin(a) * radius.current + cz.current)
      dir.current.copy(camera.position).sub(tmp.current).normalize()
      tmp.current.addScaledVector(dir.current, h * 0.6)
      g.position.lerp(tmp.current, 1 - Math.exp(-8 * dt))
      pos.current[s.id] = g.position
      g.rotation.y = damp(g.rotation.y, (Math.PI / 2 - a + Math.sin(t + i) * 0.1) * k + (1 - k) * Math.sin(t * 2) * 0.5, 6, dt); g.rotation.x = -Math.PI / 2 * flat.current
      g.scale.setScalar(1 + h * 0.1 + pulse * 0.035)
      haloGroups.current[i]?.scale.setScalar(1 + h * 0.2 + pulse * 0.62)
      if (haloMats.current[i]) haloMats.current[i]!.opacity = 0.045 + h * 0.22 + pulse * 0.42
      if (entry.current.id === s.id && phase === 'entering') {
        const elapsed = t - entry.current.started
        if (s.id === 'hearts') { g.position.y += Math.sin(elapsed * 11) * 0.18; g.scale.multiplyScalar(1 + Math.sin(elapsed * 9) * 0.08) }
        if (s.id === 'diamonds') { g.rotation.y += elapsed * 2.8; g.position.y += Math.sin(elapsed * 7) * 0.12 }
        if (s.id === 'spades') { g.rotation.z = Math.sin(elapsed * 5) * 0.22; g.rotation.x += Math.sin(elapsed * 4) * 0.16 }
        if (s.id === 'clubs') { g.position.y += elapsed * 0.35; g.rotation.z = Math.sin(elapsed * 7) * 0.1 }
      }
      if (mats.current[i]) mats.current[i]!.emissiveIntensity = 0.45 + h * 1.9 + pulse * 1.2
      if (lights.current[i]) lights.current[i]!.intensity = 1.3 + h * 5 + pulse * 8
    })
    if (click.current.id && (performance.now() - click.current.started) / 720 >= 1) click.current.id = null
  })
  return (
    <>
      {SUITS.map((s, i) => (
        <group key={s.id} ref={el => (groups.current[i] = el)}
          onPointerOver={e => { e.stopPropagation(); if (phase === 'world') setHovered(s.id) }}
          onPointerOut={() => setHovered(null)}
          onClick={e => { e.stopPropagation(); if (sw.current.moved > 8) return; click.current = { id: s.id, started: performance.now() }; onSelect(s.id) }}>
          <group ref={el => (haloGroups.current[i] = el)}>
            <RoundedBox args={[1.12, 1.52, 0.1]} radius={0.08} smoothness={4} position={[0, 0, -0.07]}>
              <meshBasicMaterial ref={el => (haloMats.current[i] = el)} color={s.color} transparent opacity={0.045} depthWrite={false} toneMapped={false} />
            </RoundedBox>
          </group>
          <RoundedBox args={[1, 1.4, 0.08]} radius={0.06} smoothness={4}>
            <meshStandardMaterial ref={el => (mats.current[i] = el)} color="#0b0b0d" metalness={0.9} roughness={0.25} emissive={s.color} emissiveIntensity={0.5} />
          </RoundedBox>
          <Html center transform distanceFactor={3} pointerEvents="none" zIndexRange={[5, 0]}>
            <div className="suit-glyph" style={{ color: s.color, textShadow: `0 0 18px ${s.color}` }}>{s.glyph}</div>
          </Html>
          <pointLight ref={el => (lights.current[i] = el)} color={s.color} distance={7} position={[0, 0, 0.6]} />
          {hovered === s.id && <Html position={[0, -1, 0]} center pointerEvents="none"><div className="suit-label" style={{ borderColor: s.color }}><b style={{ color: s.color }}>{s.glyph}</b> {s.label}</div></Html>}
        </group>
      ))}
    </>
  )
}

function Rig({ phase, pos, cameraLift, cameraZoom }: Pick<WorldProps, 'phase' | 'pos' | 'cameraLift' | 'cameraZoom'>) {
  const look = useRef(new THREE.Vector3(0, 1.5, 0)), goal = useRef(new THREE.Vector3()), lg = useRef(new THREE.Vector3())
  const aspect = useThree(state => state.size.width / state.size.height)
  useFrame(({ camera, pointer, clock }, dt) => {
    const close = phase === 'intro' && clock.elapsedTime < 3.4 // start on the felt, then pan out to the dealer
    const worldDistance = aspect < 0.8 ? 12 : 9.5
    const lift = phase === 'world' ? cameraLift.current : 0
    const distance = Math.max(4.8, worldDistance - cameraZoom.current * 1.15)
    goal.current.set(close ? 0.5 : pointer.x * 0.5, close ? 3.4 : 2.7 + pointer.y * 0.25 + lift, close ? 4.6 : distance)
    lg.current.set(0, close ? 1 : 1.7 + lift * 0.45, close ? 1.6 : -0.5)
    const id = (window as any).__enterId as string | undefined
    if (phase === 'entering' && id && pos.current[id]) {
      const direction = goal.current.copy(camera.position).sub(pos.current[id]).normalize()
      goal.current.copy(pos.current[id]).addScaledVector(direction, 4.6)
      lg.current.copy(pos.current[id])
    }
    const entering = phase === 'entering'
    camera.position.lerp(goal.current, 1 - Math.exp(-(entering ? 1.45 : 1.2) * dt))
    look.current.lerp(lg.current, 1 - Math.exp(-1.8 * dt)); camera.lookAt(look.current)
  })
  return null
}

export default function World(p: WorldProps) {
  const tableRotation = useRef(0), tableGroup = useRef<THREE.Group>(null)
  return (
    <Canvas dpr={[1, lowEnd ? 1 : 1.75]} camera={{ fov: 42, position: [0.5, 3.4, 4.6] }} gl={{ antialias: !lowEnd, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#070203']} />
      <fog attach="fog" args={['#070203', 8, 22]} />
      <ambientLight intensity={0.25} />
      <spotLight position={[0, 7, 3]} angle={0.5} penumbra={1} intensity={38} color="#ffd9a0" />
      <spotLight position={[0, 4, -4]} angle={0.6} penumbra={1} intensity={40} color="#8fa0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[12, 48]} /><meshStandardMaterial color="#1c0509" roughness={0.35} metalness={0.6} /></mesh>
      <Backdrop low={lowEnd} />
      <group ref={tableGroup}>
        <Table />
        <Players phase={p.phase} />
        <Suits {...p} tableRotation={tableRotation} />
      </group>
      <TableRotation group={tableGroup} target={tableRotation} />
      <Sparkles count={lowEnd ? 30 : 80} scale={[12, 6, 12]} size={2} speed={0.2} opacity={0.35} position={[0, 2.5, 0]} />
      <Sparkles count={lowEnd ? 16 : 42} scale={[17, 8, 14]} size={1.25} speed={0.13} opacity={0.2} color="#ffd376" position={[0, 3, -2]} />
      <Rig phase={p.phase} pos={p.pos} cameraLift={p.cameraLift} cameraZoom={p.cameraZoom} />
      {!lowEnd && <EffectComposer><Bloom intensity={0.9} luminanceThreshold={0.3} mipmapBlur /><Vignette darkness={0.8} /><Noise opacity={0.05} /></EffectComposer>}
    </Canvas>
  )
}

function TableRotation({ group, target }: { group: React.RefObject<THREE.Group>; target: MutableRefObject<number> }) {
  useFrame((_, dt) => { if (group.current) group.current.rotation.y = damp(group.current.rotation.y, target.current, 3.5, dt) })
  return null
}
