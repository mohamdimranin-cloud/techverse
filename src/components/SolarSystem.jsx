import { useRef, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Environment } from '@react-three/drei'
import { useDeviceCapability } from '../hooks/useDeviceCapability'

function SolarModel() {
  const groupRef = useRef()
  const { scene, animations } = useGLTF('/solar_system_animation.glb')
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    names.forEach(n => actions[n]?.reset().fadeIn(0.5).play())
  }, [actions, names])

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += 0.0008
    groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.04
  })

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} scale={0.5} position={[0, 0, 0]} />
    </group>
  )
}

useGLTF.preload('/solar_system_animation.glb')

export default function SolarSystem() {
  const { isLowEnd } = useDeviceCapability()
  const [opacity, setOpacity] = useState(0)

  if (isLowEnd) return null

  useEffect(() => {
    const about = document.getElementById('about')
    if (!about) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setOpacity(0.45)
        else setOpacity(0)
      },
      { threshold: 0.1 }
    )
    observer.observe(about)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 0,
      pointerEvents: 'none',
      opacity,
      transition: 'opacity 1.5s ease',
    }}>
      <Canvas
        camera={{ position: [0, 15, 65], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ background: 'transparent' }}
        frameloop="demand"
        shadows={false}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={3} color="#fff7e0" distance={40} />
        <pointLight position={[10, 5, 10]} intensity={0.5} color="#a855f7" />
        <Suspense fallback={null}>
          <SolarModel />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  )
}
