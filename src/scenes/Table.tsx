import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const CHIPS: [number, number, string, number][] = [[-1.7, 1.9, '#b91c1c', 5], [-1.45, 2.05, '#111', 4], [1.6, 1.7, '#d4af37', 6], [1.85, 1.9, '#b91c1c', 3], [-0.5, 2.9, '#f3f0e6', 4], [0.7, 3.0, '#111', 5]]
const TOP = 0.95, RAD = 3.6

function CasinoDots({ radius, count, color, speed, y }: { radius: number; count: number; color: string; speed: number; y: number }) {
  const orbit = useRef<THREE.Group>(null)
  const dots = useRef<THREE.InstancedMesh>(null)
  const matrices = useMemo(() => {
    const object = new THREE.Object3D()
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      object.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      object.updateMatrix()
      return object.matrix.clone()
    })
  }, [count, radius])
  useLayoutEffect(() => {
    matrices.forEach((matrix, i) => dots.current?.setMatrixAt(i, matrix))
    if (dots.current) dots.current.instanceMatrix.needsUpdate = true
  }, [matrices])
  useFrame((_, dt) => { if (orbit.current) orbit.current.rotation.y += speed * dt })
  return <group ref={orbit} position={[0, y, 0]}>
    <instancedMesh ref={dots} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
    </instancedMesh>
  </group>
}

export default function Table() {
  const felt = useMemo(() => { // green felt with gold casino markings
    const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const c = cv.getContext('2d')!
    const g = c.createRadialGradient(512, 620, 40, 512, 512, 512); g.addColorStop(0, '#17935a'); g.addColorStop(1, '#083d26'); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024)
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2) }
    c.strokeStyle = '#d4af37'; c.lineWidth = 5; for (const r of [470, 330]) { c.beginPath(); c.arc(512, 512, r, 0, 6.283); c.stroke() }
    c.fillStyle = '#d4af37'; c.font = '110px Georgia,serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    ;['\u2660', '\u2665', '\u2666', '\u2663'].forEach((s, i) => { const a = Math.PI * (1.2 + i * 0.2); c.save(); c.translate(512 + Math.cos(a) * 400, 512 - Math.sin(a) * 400); c.rotate(Math.PI); c.fillText(s, 0, 0); c.restore() })
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const wood = <meshStandardMaterial color="#2a0f08" roughness={0.35} metalness={0.3} />
  return (
    <group>
      <CasinoDots radius={RAD - 0.16} count={88} color="#ffd45c" speed={0.22} y={TOP + 0.08} />
      <CasinoDots radius={RAD - 0.34} count={72} color="#ff3867" speed={-0.34} y={TOP + 0.09} />
      <mesh position={[0, TOP, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[RAD, 64, Math.PI, Math.PI]} /><meshStandardMaterial map={felt} roughness={1} /></mesh>
      <mesh position={[0, TOP, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[RAD + 0.12, 0.16, 16, 64, Math.PI]} />{wood}</mesh>
      <mesh position={[0, TOP, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[RAD - 0.02, 0.02, 8, 64, Math.PI]} /><meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} emissive="#7a5a10" /></mesh>
      <mesh position={[0, TOP, 0]}><boxGeometry args={[(RAD + 0.28) * 2, 0.16, 0.3]} />{wood}</mesh>
      <mesh position={[0, TOP / 2 - 0.08, 0]}><cylinderGeometry args={[RAD + 0.1, RAD - 0.3, TOP - 0.16, 48, 1, false, -Math.PI / 2, Math.PI]} />{wood}</mesh>
      {CHIPS.map(([x, z, col, n], i) => <group key={i} position={[x, TOP + 0.02, z]}>{Array.from({ length: n }, (_, k) =>
        <mesh key={k} position={[0, k * 0.045, 0]}><cylinderGeometry args={[0.17, 0.17, 0.04, 20]} /><meshStandardMaterial color={col} roughness={0.4} emissive={k % 2 ? '#222' : '#000'} /></mesh>)}</group>)}
      {/* overhead light cone */}
      <mesh position={[0, 5, 0]}><coneGeometry args={[3.2, 8, 32, 1, true]} /><meshBasicMaterial color="#ffd98a" transparent opacity={0.1} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <pointLight position={[0, 4.5, 0]} intensity={12} distance={10} color="#ffe2a8" />
    </group>
  )
}
