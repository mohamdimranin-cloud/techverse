import styles from './Timeline.module.css'

const steps = [
  { n: '01', title: 'Registration Opens', desc: 'Sign up your team and secure your spot in the TechVerse.' },
  { n: '02', title: 'Shortlisting', desc: 'Top teams selected based on idea abstracts submitted.' },
  { n: '03', title: 'Hackathon Begins', desc: 'The clock starts. Build, break, and innovate.' },
  { n: '04', title: 'Final Submission', desc: 'Submit your project and prepare your pitch.' },
  { n: '05', title: 'Results & Prize Distribution', desc: 'Winners announced. Glory awaits.' },
]

export default function Timeline() {
  return (
    <section className="section" id="timeline">
      <div className="container">
        <p className="section-tag">Schedule</p>
        <h2 className="section-title">Timeline</h2>
        <div className={styles.timeline}>
          {steps.map(s => (
            <div key={s.n} className={styles.item}>
              <div className={styles.dot} />
              <div className={`glass-card ${styles.card}`}>
                <span className={styles.step}>{s.n}</span>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
