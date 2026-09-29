import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

export interface Look { coat: string; scarf: string; hair: string; skin: string; glow: boolean; seed: number; trim: string; aura: string; sigil: string }

const TORSO = [[0, 0], [0.3, 0], [0.34, 0.14], [0.31, 0.35], [0.33, 0.62], [0.4, 0.95], [0.48, 1.28], [0.46, 1.48], [0.32, 1.68], [0.2, 1.73], [0, 1.73]].map(([r, y]) => new THREE.Vector2(r, y))
const BUTTONS = [[0.58, 0.34], [0.88, 0.37], [1.18, 0.4]]
const DEFAULT_LOOK: Look = { coat: '#49352e', scarf: '#87634f', hair: '#2a1e18', skin: '#c4b1a2', glow: false, seed: 0, trim: '#d4af37', aura: '#ffd36a', sigil: '♠' }

export default function Magician(appearance: Partial<Look> = {}) {
  const look = { ...DEFAULT_LOOK, ...appearance }
  const root = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null), scarf = useRef<THREE.Group>(null), aura = useRef<THREE.Group>(null), arms = useRef<(THREE.Group | null)[]>([])
  const style = Math.abs(Math.floor(look.seed * 10)) % 3
  const skin = <meshStandardMaterial color={look.skin} roughness={0.78} metalness={0} />
  const jacket = <meshStandardMaterial color={look.coat} roughness={0.88} metalness={0.02} />
  const trim = <meshStandardMaterial color={look.trim} roughness={0.42} metalness={0.65} />
  const hair = <meshStandardMaterial color={look.hair} roughness={0.94} />

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + look.seed
    if (root.current) root.current.scale.y = 1 + Math.sin(t * 1.15) * 0.008
    if (head.current) { head.current.rotation.y = Math.sin(t * 0.32) * 0.12; head.current.rotation.x = Math.sin(t * 0.24) * 0.025 }
    if (scarf.current) scarf.current.rotation.z = Math.sin(t * 0.65) * 0.035
    arms.current.forEach((arm, i) => { if (arm) arm.rotation.x = Math.sin(t * 0.55 + i * 1.4) * 0.025 })
    if (aura.current) { aura.current.rotation.z = Math.sin(t * 0.2) * 0.07; aura.current.scale.setScalar(1 + Math.sin(t * 0.6) * 0.025) }
  })

  return (
    <group ref={root}>
      <mesh><latheGeometry args={[TORSO, 48]} />{jacket}</mesh>
      <mesh position={[0, 0.9, 0.405]} scale={[0.48, 0.66, 0.09]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={look.scarf} roughness={0.9} /></mesh>
      <mesh position={[0, 1.31, 0.375]} rotation={[0.04, 0, 0]}><shapeGeometry args={[(() => { const p = new THREE.Shape(); p.moveTo(-0.24, 0.34); p.lineTo(-0.08, 0.42); p.lineTo(0, 0.13); p.lineTo(0.08, 0.42); p.lineTo(0.24, 0.34); p.lineTo(0.19, -0.18); p.lineTo(0, -0.36); p.lineTo(-0.19, -0.18); p.closePath(); return p })()]} /><meshStandardMaterial color={look.coat} roughness={0.84} side={THREE.DoubleSide} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 0.21, 1.2, 0.385]} rotation={[0.02, 0, side * -0.1]}><boxGeometry args={[0.012, 0.9, 0.008]} />{trim}</mesh>
        <mesh position={[side * 0.075, 1.35, 0.402]}><sphereGeometry args={[0.035, 12, 10]} />{trim}</mesh>
      </group>)}
      {BUTTONS.map(([y, z]) => <mesh key={y} position={[0, y, z]}><sphereGeometry args={[0.022, 12, 10]} />{trim}</mesh>)}

      <mesh position={[0, 1.76, 0.02]}><cylinderGeometry args={[0.105, 0.13, 0.22, 20]} />{skin}</mesh>
      {[-1, 1].map(side => <group key={`legs${side}`} position={[side * 0.17, 0.31, 0.02]}>
        <mesh position={[0, -0.04, 0.24]} rotation={[Math.PI / 2.15, side * 0.025, 0]}><capsuleGeometry args={[0.15, 0.46, 5, 12]} /><meshStandardMaterial color={style === 1 ? '#282b35' : '#24231f'} roughness={0.94} /></mesh>
        <mesh position={[0, -0.3, 0.48]} rotation={[0.12, 0, 0]}><capsuleGeometry args={[0.115, 0.32, 5, 12]} /><meshStandardMaterial color="#211e1c" roughness={0.94} /></mesh>
        <mesh position={[0, -0.48, 0.6]} scale={[0.14, 0.085, 0.24]}><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#171615" roughness={0.68} /></mesh>
        <mesh position={[0, -0.42, 0.72]} scale={[0.095, 0.018, 0.012]}><boxGeometry args={[1, 1, 1]} />{trim}</mesh>
      </group>)}
      <group ref={head} position={[0, 1.98, 0.015]}>
        <mesh scale={[0.86, 1.08, 0.92]}><sphereGeometry args={[0.235, 40, 32]} />{skin}</mesh>
        {[-1, 1].map(side => <mesh key={`ear${side}`} position={[side * 0.195, -0.015, 0]} scale={[0.5, 0.74, 0.52]}><sphereGeometry args={[0.08, 20, 16]} />{skin}</mesh>)}
        <mesh position={[0, -0.018, 0.204]} scale={[0.54, 0.7, 0.56]}><sphereGeometry args={[0.076, 20, 16]} />{skin}</mesh>
        {[-1, 1].map(side => <group key={`eye${side}`} position={[side * 0.078, 0.048, 0.192]}>
          <mesh scale={[1.28, 0.82, 0.58]}><sphereGeometry args={[0.038, 20, 16]} /><meshStandardMaterial color="#eee8dd" roughness={0.45} /></mesh>
          <mesh position={[0, 0, 0.022]}><sphereGeometry args={[0.019, 18, 14]} /><meshStandardMaterial color={look.seed % 2 ? '#60796e' : '#69778e'} roughness={0.38} /></mesh>
          <mesh position={[0, 0, 0.034]}><sphereGeometry args={[0.008, 12, 10]} /><meshStandardMaterial color="#17191a" /></mesh>
          <mesh position={[0, 0.053, -0.004]} rotation={[0, 0, -side * 0.08]}><boxGeometry args={[0.088, 0.02, 0.025]} />{hair}</mesh>
        </group>)}
        <mesh position={[0, -0.116, 0.207]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.078, 0.013, 0.014]} /><meshStandardMaterial color="#704f49" roughness={0.9} /></mesh>
        <mesh position={[style === 1 ? 0.025 : -0.012, 0.145, -0.02]} scale={[1.04 + (style === 1 ? 0.12 : 0), style === 2 ? 0.43 : 0.58, 0.96]}><sphereGeometry args={[0.22, 32, 24]} />{hair}</mesh>
        {style === 1 && <mesh position={[0.16, 0.16, -0.045]} scale={[0.22, 0.34, 0.42]}><sphereGeometry args={[0.19, 20, 16]} />{hair}</mesh>}
        {style === 2 && <>
          <mesh position={[0, -0.145, 0.12]} scale={[0.76, 0.56, 0.62]}><sphereGeometry args={[0.13, 24, 18]} />{hair}</mesh>
          <mesh position={[0, -0.018, 0.212]} scale={[0.46, 0.28, 0.34]}><sphereGeometry args={[0.12, 20, 16]} />{hair}</mesh>
        </>}
      </group>

      <group ref={scarf}>
        <mesh position={[0, 1.68, 0.12]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.035, 10, 24]} /><meshStandardMaterial color={look.scarf} roughness={0.92} /></mesh>
        <mesh position={[0.13, 1.39, 0.24]} rotation={[-0.08, 0, 0.08]}><boxGeometry args={[0.105, 0.48, 0.035]} /><meshStandardMaterial color={look.scarf} roughness={0.92} /></mesh>
      </group>

      {[-1, 1].map((side, i) => <group key={`arm${side}`} ref={el => { arms.current[i] = el }} position={[side * 0.39, 1.76, 0.06]}>
        <mesh position={[side * 0.035, -0.15, 0.02]} rotation={[0, 0, side * -0.12]}><capsuleGeometry args={[0.115, 0.28, 5, 10]} />{jacket}</mesh>
        <mesh position={[side * 0.07, -0.32, 0.07]}><sphereGeometry args={[0.105, 20, 16]} />{skin}</mesh>
        <mesh position={[side * 0.06, -0.4, 0.25]} rotation={[Math.PI / 2.5, 0, 0]}><capsuleGeometry args={[0.088, 0.25, 5, 10]} />{jacket}</mesh>
        <mesh position={[side * 0.06, -0.48, 0.4]} scale={[0.9, 0.65, 1.1]}><sphereGeometry args={[0.095, 18, 14]} />{skin}</mesh>
        {[-1, 0, 1].map(finger => <mesh key={finger} position={[side * 0.06 + finger * 0.035, -0.5, 0.48]} rotation={[0.2, 0, finger * -0.1]}><capsuleGeometry args={[0.012, 0.055, 3, 6]} />{skin}</mesh>)}
      </group>)}

      <group ref={aura} position={[0, 1.05, -0.18]}>
        <mesh scale={[0.7, 1.3, 1]}><torusGeometry args={[0.48, 0.009, 6, 40]} /><meshStandardMaterial color={look.aura} emissive={look.aura} emissiveIntensity={0.35} transparent opacity={0.15} depthWrite={false} /></mesh>
      </group>
      <Sparkles count={3} scale={[0.7, 1.5, 0.28]} size={1.35} speed={0.12} opacity={0.18} color={look.aura} position={[0, 1.22, -0.2]} />
      <mesh position={[0, 1.38, 0.405]}><torusGeometry args={[0.085, 0.012, 8, 20]} />{trim}</mesh>
      <Html position={[0, 1.38, 0.42]} center transform distanceFactor={5} pointerEvents="none" zIndexRange={[2, 0]}>
        <span className="player-sigil" style={{ color: look.aura, textShadow: `0 0 6px ${look.aura}` }}>{look.sigil}</span>
      </Html>
      <pointLight position={[0, 2.02, 0.55]} color={look.skin} intensity={1.4} distance={2.4} />
    </group>
  )
}