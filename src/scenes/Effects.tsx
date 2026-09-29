import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
export default function Effects() {
  return <EffectComposer><Bloom intensity={0.9} luminanceThreshold={0.3} mipmapBlur /><Vignette darkness={0.8} /><Noise opacity={0.05} /></EffectComposer>
}
