import { useRef, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, OrbitControls, Environment, ContactShadows, Center, Bounds } from '@react-three/drei'
import * as THREE from 'three'
import { useDeviceCapability } from '../hooks/useDeviceCapability'

function RobotModel() {
  const groupRef = useRef()
  const { scene, animations } = useGLTF('/robot.glb')
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    if (names.length > 0) actions[names[0]]?.reset().fadeIn(0.5).play()

    // Auto-fit: normalize the model to a known size
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetHeight = 2.2          // world units tall
    const scale = targetHeight / maxDim
    scene.scale.setScalar(scale)

    // Sit the bottom of the model at y = -0.8
    box.setFromObject(scene)
    const newMin = box.min.y
    scene.position.y = -0.8 - newMin
  }, [scene, actions, names])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!groupRef.current) return
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.1
    groupRef.current.rotation.y += 0.003
  })

  return <group ref={groupRef} dispose={null}><primitive object={scene} /></group>
}

function GlowRing() {
  const meshRef = useRef()
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!meshRef.current) return
    meshRef.current.material.emissiveIntensity = 2 + Math.sin(t * 2) * 1
    meshRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.06
    meshRef.current.scale.z = 1 + Math.sin(t * 1.5) * 0.06
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
      <torusGeometry args={[1.0, 0.05, 16, 100]} />
      <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={3} toneMapped={false} />
    </mesh>
  )
}

function GlowRingOuter() {
  const meshRef = useRef()
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!meshRef.current) return
    meshRef.current.material.emissiveIntensity = 1.5 + Math.sin(t * 1.5 + 1) * 0.8
    meshRef.current.rotation.z += 0.006
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]}>
      <torusGeometry args={[1.4, 0.025, 16, 100]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
    </mesh>
  )
}

// Vertical glow column beneath robot
function GlowBeam() {
  const meshRef = useRef()
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!meshRef.current) return
    meshRef.current.material.opacity = 0.08 + Math.sin(t * 1.5) * 0.04
  })
  return (
    <mesh ref={meshRef} position={[0, -0.5, 0]}>
      <cylinderGeometry args={[0.4, 0.8, 2, 32, 1, true]} />
      <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2}
        transparent opacity={0.1} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  )
}

function EnergyOrbs() {
  const orbsRef = useRef([])
  const count = 6
  const colors = ['#a855f7', '#22d3ee', '#38bdf8', '#7c3aed', '#f0abfc', '#818cf8']
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    orbsRef.current.forEach((orb, i) => {
      if (!orb) return
      const angle = (i / count) * Math.PI * 2 + t * 0.5
      orb.position.x = Math.cos(angle) * 1.8
      orb.position.y = Math.sin(t * 0.9 + i * 1.2) * 0.5 - 0.3
      orb.position.z = Math.sin(angle) * 1.8
    })
  })
  return (
    <>
      {colors.map((clr, i) => (
        <mesh key={i} ref={el => orbsRef.current[i] = el}>
          <sphereGeometry args={[0.06 + (i % 3) * 0.025, 16, 16]} />
          <meshStandardMaterial color={clr} emissive={clr} emissiveIntensity={8} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

useGLTF.preload('/robot.glb')

export default function Robot3D() {
  const { isLowEnd } = useDeviceCapability()

  if (isLowEnd) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/robot-fallback.png" alt="Robot" style={{ maxHeight: '80%', maxWidth: '80%', objectFit: 'contain', filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.5))' }}
          onError={e => { e.target.style.fontSize = '8rem'; e.target.outerHTML = '<div style="font-size:8rem;animation:none">🤖</div>' }} />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 0.2, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ background: 'transparent' }}
        frameloop="demand"
        shadows={false}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 5, 4]} intensity={6} color="#a855f7" />
        <pointLight position={[-3, -1, 3]} intensity={4} color="#22d3ee" />
        <spotLight position={[0, 6, 2]} intensity={4} color="#ffffff" angle={0.35} penumbra={1} />

        <Suspense fallback={null}>
          <RobotModel />
          <GlowRing />
          <GlowRingOuter />
          <GlowBeam />
          <ContactShadows position={[0, -0.82, 0]} opacity={0.7} scale={5} blur={3} color="#a855f7" />
          <Environment preset="night" />
        </Suspense>

        <EnergyOrbs />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 3.5}
        />
      </Canvas>
    </div>
  )
}
