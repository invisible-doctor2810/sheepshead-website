import Magician, { Look } from './Magician'
import { Html, RoundedBox } from '@react-three/drei'
import { leaderboard } from '../data/leaderboard'
import type { Phase } from '../App'
import { useEffect, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { getStandings, refreshStandings, subscribeStandings, topPlayers } from '../services/scoreService'

const LOOKS: Partial<Look>[] = [
  { coat: '#49352e', scarf: '#87634f', hair: '#2a1e18', skin: '#c4b1a2', trim: '#d4af37', aura: '#ffd36a', sigil: '♠', glow: false, seed: 0 },
  { coat: '#30435a', scarf: '#9b4654', hair: '#171615', skin: '#a88568', trim: '#d3a447', aura: '#e6b65d', sigil: '♦', glow: false, seed: 1.3 },
  { coat: '#58313b', scarf: '#c9b47a', hair: '#6b4a2a', skin: '#d3b8a4', trim: '#caa866', aura: '#d96a7e', sigil: '♥', glow: false, seed: 2.6 },
  { coat: '#34523e', scarf: '#64635d', hair: '#77746c', skin: '#b89b85', trim: '#c6ae72', aura: '#77c69b', sigil: '♣', glow: false, seed: 3.9 },
  { coat: '#4a4335', scarf: '#8b514d', hair: '#3a2a1a', skin: '#8f6a4e', trim: '#d4af37', aura: '#e4a757', sigil: '♠', glow: false, seed: 5.2 },
]
const SEAT_R = 4.05

/** Five players seated at the points of a pentagram, all facing the centre of the table. */
export default function Players({ phase }: { phase: Phase }) {
  // Labels are shown in the intro/main world; they fade out as soon as a suit is entered
  // (entering), stay hidden in every card panel and while exiting, and fade back in on 'world'.
  const standings = useSyncExternalStore(subscribeStandings, getStandings)
  useEffect(() => { refreshStandings(); const id = setInterval(() => refreshStandings(true), 120000); return () => clearInterval(id) }, [])
  // Top 5 all-time by summed score, straight from the sheet; static list only until the sheet answers.
  const top = standings && standings.length ? topPlayers(standings) : leaderboard
  const visible = phase === 'intro' || phase === 'world'
  const labelStyle = {
    '--player-label-opacity': visible ? 1 : 0,
    '--player-label-duration': visible ? '500ms' : '400ms', // fade in ~500ms, out ~400ms
  } as CSSProperties
  return <>{LOOKS.map((look, k) => {
    const phi = -Math.PI / 2 + (k * 2 * Math.PI) / 5, x = Math.cos(phi) * SEAT_R, z = Math.sin(phi) * SEAT_R
    const tableFacing = Math.atan2(-Math.cos(phi), -Math.sin(phi))
    const player = top[k]
    return (
      <group key={k} position={[x, 0, z]} rotation={[0, tableFacing * 0.62, 0]}>
        {player && <Html position={[0, 2.78, 0]} center pointerEvents="none" zIndexRange={[5, 0]}>
          <div className="player-leader-tag" style={labelStyle}><span>{k + 1}</span><strong>{player.name}</strong><b>{player.total > 0 ? '+' : ''}{player.total}</b></div>
        </Html>}
        <RoundedBox args={[0.58, 0.46, 0.1]} radius={0.055} smoothness={4} position={[0, 0.78, -0.55]}><meshStandardMaterial color="#260b10" roughness={0.62} metalness={0.12} /></RoundedBox>
        <RoundedBox args={[0.62, 0.025, 0.11]} radius={0.012} smoothness={3} position={[0, 1.015, -0.55]}><meshStandardMaterial color="#b99a53" metalness={0.72} roughness={0.36} /></RoundedBox>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.48, 0.44, 0.1, 24]} /><meshStandardMaterial color="#2a0a10" roughness={0.5} /></mesh>
        <group position={[0, -0.05, 0]}><Magician {...look} /></group>
      </group>
    )
  })}</>
}
