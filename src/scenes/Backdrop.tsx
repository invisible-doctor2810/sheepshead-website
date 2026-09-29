import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SUITS } from '../data/club'

const SIGN_Y = 6.4, BULBS = Array.from({ length: 21 }, (_, i) => -9 + i * 0.9)
const mk = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace
  const go = () => { draw(cv.getContext('2d')!); t.needsUpdate = true }; go(); document.fonts?.load("120px 'IM Fell English SC'").then(go); return t
}

export default function Backdrop({ low }: { low: boolean }) {
  const A = useRef<THREE.Group>(null), B = useRef<THREE.Group>(null), sign = useRef<THREE.MeshBasicMaterial>(null), cards = useRef<THREE.InstancedMesh>(null), candle = useRef<THREE.PointLight>(null)
  const aspect = useThree(state => state.size.width / state.size.height), signScale = Math.min(1, aspect / 1.15)
  const N = low ? 10 : 24
  const wall = useMemo(() => mk(1024, 512, c => { // burgundy damask casino wall
    const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#12040a'); g.addColorStop(1, '#2b0710'); c.fillStyle = g; c.fillRect(0, 0, 1024, 512)
    c.strokeStyle = 'rgba(212,175,55,.16)'; for (let x = -512; x < 1536; x += 56) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 256, 512); c.moveTo(x + 256, 0); c.lineTo(x, 512); c.stroke() }
  }), [])
  const signTex = useMemo(() => mk(2048, 512, c => {
    c.clearRect(0, 0, 2048, 512); c.fillStyle = '#0a0204e6'; c.beginPath(); c.roundRect(20, 20, 2008, 472, 50); c.fill()
    c.strokeStyle = '#d4af37'; c.lineWidth = 12; c.shadowColor = '#d4af37'; c.shadowBlur = 30; c.stroke()
    c.strokeStyle = '#ff2e4d'; c.lineWidth = 4; c.shadowColor = '#ff2e4d'; c.beginPath(); c.roundRect(50, 50, 1948, 412, 34); c.stroke()
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffe9b0'; c.shadowColor = '#ffb020'; c.shadowBlur = 40
    let titleSize = 220
    c.font = `700 ${titleSize}px 'IM Fell English SC', Georgia, serif`
    while (c.measureText('SHEEPSHEAD CLUB').width > 1780 && titleSize > 100) {
      titleSize -= 4
      c.font = `700 ${titleSize}px 'IM Fell English SC', Georgia, serif`
    }
    c.fillText('SHEEPSHEAD CLUB', 1024, 205)
    c.font = '84px Georgia, serif'; c.fillStyle = '#ff5a70'; c.shadowColor = '#ff2e4d'; c.fillText('\u2665   \u2660   \u2666   \u2663', 1024, 396)
  }), [])
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: Math.random() * 6.28, r: 5 + Math.random() * 6, y: 0.8 + Math.random() * 6, s: 0.2 + Math.random() * 0.4, o: Math.random() * 9, c: new THREE.Color(SUITS[i % 4].color).multiplyScalar(0.55) })), [N])
  useLayoutEffect(() => { seeds.forEach((s, i) => cards.current?.setColorAt(i, s.c)); if (cards.current?.instanceColor) cards.current.instanceColor.needsUpdate = true }, [seeds])
  const d = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, on = Math.floor(t * 2.5) % 2 === 0 // chasing marquee bulbs
    if (A.current) A.current.visible = on; if (B.current) B.current.visible = !on
    sign.current?.color.setScalar(0.85 + Math.sin(t * 2.2) * 0.12 + (Math.random() > 0.995 ? -0.25 : 0)) // neon pulse + rare flicker
    if (candle.current) candle.current.intensity = 14 + Math.sin(t * 9) * 2 + Math.sin(t * 23) * 1.5
    seeds.forEach((s, i) => {
      d.position.set(Math.cos(s.a + t * 0.05 * s.s) * s.r, s.y + Math.sin(t * s.s + s.o) * 0.4, -2 - (Math.sin(s.a + t * 0.05 * s.s) * 0.5 + 0.5) * 6)
      d.rotation.set(t * s.s, t * s.s * 0.7 + s.o, 0); d.updateMatrix(); cards.current?.setMatrixAt(i, d.matrix)
    })
    if (cards.current) cards.current.instanceMatrix.needsUpdate = true
  })
  const bulb = (x: number, y: number, k: string) => <mesh key={k} position={[x, y, 0]}><sphereGeometry args={[0.09, 8, 8]} /><meshBasicMaterial color="#ffd36a" toneMapped={false} /></mesh>
  return (
    <>
      <mesh position={[0, 6, -11]}><planeGeometry args={[46, 23]} /><meshBasicMaterial map={wall} toneMapped={false} fog={false} /></mesh>
      <group position={[0, SIGN_Y, -10.6]} scale={signScale}>
        <mesh><planeGeometry args={[18, 4.5]} /><meshBasicMaterial ref={sign} map={signTex} transparent toneMapped={false} fog={false} /></mesh>
        <group ref={A} position={[0, 0, 0.05]}>{BULBS.flatMap((x, i) => i % 2 ? [] : [bulb(x, 2.5, 't' + i), bulb(x, -2.5, 'b' + i)])}</group>
        <group ref={B} position={[0, 0, 0.05]}>{BULBS.flatMap((x, i) => i % 2 ? [bulb(x, 2.5, 't' + i), bulb(x, -2.5, 'b' + i)] : [])}</group>
      </group>
      {[-1, 1].map(s => <group key={s} position={[s * 11, 0, -8]}>
        <mesh position={[0, 5, 0]}><cylinderGeometry args={[0.8, 0.9, 10, 24]} /><meshStandardMaterial color="#2a0810" roughness={0.4} metalness={0.5} /></mesh>
        {[0.3, 9.7].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[1.05, 1.05, 0.3, 24]} /><meshStandardMaterial color="#d4af37" metalness={1} roughness={0.25} emissive="#5a3f08" /></mesh>)}
      </group>)}
      {/* chandelier over the table */}
      <group position={[0, 6.2, 1.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.3, 0.05, 8, 40]} /><meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} /></mesh>
        {Array.from({ length: 10 }, (_, k) => <mesh key={k} position={[Math.cos(k * 0.628) * 1.3, 0.1, Math.sin(k * 0.628) * 1.3]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#fff1c2" toneMapped={false} /></mesh>)}
      </group>
      <instancedMesh ref={cards} args={[undefined, undefined, N]}><boxGeometry args={[0.35, 0.5, 0.01]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
      <pointLight ref={candle} position={[-6, 3, -3]} color="#ff8a4a" distance={16} />
      <pointLight position={[6, 3, -3]} color="#ff2e4d" intensity={8} distance={14} />
    </>
  )
}
