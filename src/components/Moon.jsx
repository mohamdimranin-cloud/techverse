import { useRef, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'

function MoonModel() {
  const ref = useRef()
  const { scene } = useGLTF('/moon.glb')

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const s = 2 / maxDim
    scene.scale.setScalar(s)
    const center = new THREE.Vector3()
    box.getCenter(center)
    scene.position.set(-center.x * s, -center.y * s, -center.z * s)
  }, [scene])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y += 0.001
    ref.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.08
  })

  return <group ref={ref}><primitive object={scene} /></group>
}

useGLTF.preload('/moon.glb')

export default function Moon() {
  return (
    <div style={{
      position: 'fixed', top: 50, right: 10,
      width: 130, height: 130,
      zIndex: 1, pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#fff5d0" />
        <pointLight position={[-3, -2, 2]} intensity={0.4} color="#a855f7" />
        <Suspense fallback={null}>
          <MoonModel />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  )
}
