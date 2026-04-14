import styles from './About.module.css'

const stats = [
  { num: '120+', label: 'Participants' },
  { num: '24H', label: 'Non-Stop' },
  { num: '6', label: 'Domains' },
  { num: '₹50K+', label: 'Cash Prize' },
]

export default function About() {
  return (
    <section className="section" id="about">
      <div className="container">
        <p className="section-tag">🌌 About</p>
        <h2 className="section-title">What is TechVerse?</h2>
        <div className={styles.grid}>
          <div className={`glass-card ${styles.card}`}>
            <p>TechVerse is more than just a hackathon — it's a journey into a world of innovation. Participants will collaborate, ideate, and develop cutting-edge solutions across various domains including AI, Web, IoT, and Cybersecurity.</p>
            <p>Whether you're a beginner or a pro, TechVerse is your platform to explore, experiment, and excel.</p>
          </div>
          <div className={styles.stats}>
            {stats.map(s => (
              <div key={s.label} className={`glass-card ${styles.stat}`}>
                <span className={styles.num}>{s.num}</span>
                <span className={styles.label}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
