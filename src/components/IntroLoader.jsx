import { useRef, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Environment } from '@react-three/drei'
import { useDeviceCapability } from '../hooks/useDeviceCapability'
import styles from './IntroLoader.module.css'

function IntroRobot() {
  const groupRef = useRef()
  const { scene, animations } = useGLTF('/robot_intro.glb')
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    if (names.length > 0) actions[names[0]]?.reset().fadeIn(0.3).play()
  }, [actions, names])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!groupRef.current) return
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.08
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.3
  })

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} scale={0.8} position={[0, -1.5, 0]} />
    </group>
  )
}

useGLTF.preload('/robot_intro.glb')

export default function IntroLoader({ onDone }) {
  const { isLowEnd } = useDeviceCapability()
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 5400)
    const doneTimer = setTimeout(() => onDone(), 6000)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div className={`${styles.overlay} ${fadeOut ? styles.fadeOut : ''}`}>
      {!isLowEnd && (
        <div className={styles.canvasWrap}>
          <Canvas
            camera={{ position: [0, 1, 5], fov: 45 }}
            gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
            style={{ background: 'transparent' }}
            frameloop="always"
            shadows={false}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[4, 4, 4]} intensity={4} color="#a855f7" />
            <pointLight position={[-4, -2, 3]} intensity={3} color="#22d3ee" />
            <Suspense fallback={null}>
              <IntroRobot />
              <Environment preset="night" />
            </Suspense>
          </Canvas>
        </div>
      )}
      {isLowEnd && <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🤖</div>}

      <div className={styles.text}>
        <p className={styles.tag}>Bearys Institute of Technology Presents</p>
        <h1 className={styles.title}>TECHVERSE</h1>
        <p className={styles.sub}>HACKATHON 2026</p>
        <div className={styles.dots}>
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}
