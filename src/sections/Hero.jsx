import { Link } from 'react-router-dom'
import { useEffect, useRef, Suspense, lazy } from 'react'
import { useDeviceCapability } from '../hooks/useDeviceCapability'
import styles from './Hero.module.css'

const Robot3D = lazy(() => import('../components/Robot3D'))

export default function Hero() {
  const { isLowEnd } = useDeviceCapability()
  const orbRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      if (!orbRef.current) return
      const x = (e.clientX / window.innerWidth - 0.5) * 30
      const y = (e.clientY / window.innerHeight - 0.5) * 30
      orbRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <section className={styles.hero} id="home">
      <div ref={orbRef} className={styles.orb} />

      {/* Left: text */}
      <div className={styles.content}>
        <p className={styles.eyebrow}>🚀 Bearys Institute of Technology Presents</p>
        <h1 className={styles.title}>
          TECHVERSE<br />
          <span>HACKATHON 2026</span>
        </h1>
        <p className={styles.subtitle}>
          Enter a universe where ideas collide, innovation thrives,<br />
          and technology shapes the future.
        </p>
        <p className={styles.desc}>
          Join the most electrifying hackathon at Bearys Institute of Technology,
          where developers, designers, and innovators come together to build impactful solutions.
        </p>
        <div className={styles.btns}>
          <Link to="/register" className="btn btn-primary btn-lg">🔥 Register Now</Link>
          <a href="#domains" className="btn btn-outline btn-lg">📜 View Problem Statements</a>
        </div>
      </div>

      {/* Right: 3D Robot or fallback */}
      <div className={styles.robotWrap}>
        {isLowEnd ? (
          <div className={styles.robotFallback}>🤖</div>
        ) : (
          <Suspense fallback={<div className={styles.robotFallback}>🤖</div>}>
            <Robot3D />
          </Suspense>
        )}
      </div>
    </section>
  )
}
