import { useEffect, useRef } from 'react'

const MAX = 80

export default function CursorGlow() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const trail = []
    let mouse = { x: -500, y: -500 }
    let hueOffset = 0
    let raf

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    window.addEventListener('mousemove', onMove)

    // Smooth lagging head
    const head = { x: -500, y: -500 }

    const draw = () => {
      head.x += (mouse.x - head.x) * 0.2
      head.y += (mouse.y - head.y) * 0.2

      trail.unshift({ x: head.x, y: head.y })
      if (trail.length > MAX) trail.pop()

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (trail.length < 3) { raf = requestAnimationFrame(draw); return }

      hueOffset += 0.8

      // Draw the single glowing line using quadratic curves
      for (let pass = 0; pass < 3; pass++) {
        // pass 0 = wide soft glow, pass 1 = medium, pass 2 = bright core
        const widths = [8, 3, 1.2]
        const alphas = [0.18, 0.45, 0.9]

        ctx.beginPath()
        ctx.moveTo(trail[0].x, trail[0].y)

        for (let i = 1; i < trail.length - 1; i++) {
          const mx = (trail[i].x + trail[i + 1].x) / 2
          const my = (trail[i].y + trail[i + 1].y) / 2
          ctx.quadraticCurveTo(trail[i].x, trail[i].y, mx, my)
        }

        // Build gradient along the line
        const grad = ctx.createLinearGradient(
          trail[trail.length - 1].x, trail[trail.length - 1].y,
          trail[0].x, trail[0].y
        )
        // Tail: fade out
        grad.addColorStop(0, `hsla(${hueOffset + 60}, 100%, 60%, 0)`)
        grad.addColorStop(0.3, `hsla(${hueOffset + 40}, 100%, 65%, ${alphas[pass] * 0.4})`)
        grad.addColorStop(0.6, `hsla(${hueOffset + 20}, 100%, 70%, ${alphas[pass] * 0.7})`)
        // Head: brightest
        grad.addColorStop(1, `hsla(${hueOffset}, 100%, 80%, ${alphas[pass]})`)

        ctx.strokeStyle = grad
        ctx.lineWidth = widths[pass]
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 9998,
    }} />
  )
}
