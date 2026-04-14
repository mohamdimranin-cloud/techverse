import { useRef, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Environment } from '@react-three/drei'

function Cosmonaut() {
  const groupRef = useRef()
  const trailRef = useRef()
  const glowRef = useRef()
  const { scene, animations } = useGLTF('/cosmonaut.glb')
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    if (names.length > 0) actions[names[0]]?.reset().fadeIn(0.3).play()
  }, [actions, names])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!groupRef.current) return

    const flyDuration = 6    // seconds to cross screen
    const totalCycle = 16   // fly 6s + wait 10s
    const progress = (t % totalCycle) / flyDuration

    const flying = progress <= 1
    groupRef.current.visible = flying
    if (trailRef.current) trailRef.current.visible = flying
    if (glowRef.current) glowRef.current.visible = flying
    if (!flying) return

    const x = -10 + progress * 20
    const y = Math.sin(progress * Math.PI) * 0.3

    groupRef.current.position.x = x
    groupRef.current.position.y = y
    groupRef.current.rotation.z = -0.25
    groupRef.current.rotation.y = -0.3

    // Trail follows behind
    if (trailRef.current) {
      trailRef.current.position.x = x - 0.3
      trailRef.current.position.y = y
      trailRef.current.material.opacity = 0.18 + Math.sin(t * 8) * 0.06
    }
    // Point glow follows rocket
    if (glowRef.current) {
      glowRef.current.position.x = x
      glowRef.current.position.y = y
    }

    const fadeZone = 0.08
    let opacity = 1
    if (progress < fadeZone) opacity = progress / fadeZone
    else if (progress > 1 - fadeZone) opacity = (1 - progress) / fadeZone

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true
        child.material.opacity = opacity
      }
    })
  })

  return (
    <>
      <group ref={groupRef} dispose={null}>
        <primitive object={scene} scale={0.012} />
      </group>
      {/* Rocket exhaust trail */}
      <mesh ref={trailRef} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.5, 16]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316"
          emissiveIntensity={4} transparent opacity={0.2} toneMapped={false} />
      </mesh>
      {/* Moving point light attached to rocket */}
      <pointLight ref={glowRef} intensity={6} distance={4} color="#a855f7" />
    </>
  )
}

useGLTF.preload('/cosmonaut.glb')

export default function CosmonautFlying() {
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    const section = document.getElementById('prizes')
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
          // fly 6s, wait 10s, repeat — hide after 3 full cycles
          setTimeout(() => { setVisible(false); setDone(true) }, 16 * 3 * 1000)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [done])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      zIndex: 1,
    }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={3} color="#a855f7" />
        <pointLight position={[-4, 2, 3]} intensity={2} color="#22d3ee" />
        {/* Glow lights that follow roughly where the rocket is */}
        <pointLight position={[0, 0, 3]} intensity={5} color="#a855f7" />
        <pointLight position={[0, 0, 3]} intensity={4} color="#22d3ee" />
        <spotLight position={[0, 4, 4]} intensity={6} color="#f0abfc" angle={0.5} penumbra={1} />
        <Suspense fallback={null}>
          <Cosmonaut />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  )
}
