import styles from './Judging.module.css'

const criteria = [
  { icon: '', title: 'Innovation', desc: 'Originality and creativity of the solution.', clr: '#7c3aed', pct: '25%' },
  { icon: '', title: 'Technical Implementation', desc: 'Code quality, architecture, and complexity.', clr: '#0ea5e9', pct: '25%' },
  { icon: '', title: 'UI/UX', desc: 'Design, usability, and user experience.', clr: '#ec4899', pct: '20%' },
  { icon: '', title: 'Impact', desc: 'Real-world relevance and scalability.', clr: '#10b981', pct: '20%' },
  { icon: '', title: 'Presentation', desc: 'Clarity and confidence in pitching the idea.', clr: '#f59e0b', pct: '10%' },
]

export default function Judging() {
  return (
    <section className="section section-alt" id="judging">
      <div className="container">
        <p className="section-tag">Evaluation</p>
        <h2 className="section-title">Judging Criteria</h2>
        <div className={styles.grid}>
          {criteria.map(c => (
            <div key={c.title} className={`glass-card ${styles.card}`}>
              <div className={styles.bar} style={{ width: c.pct, background: c.clr, boxShadow: `0 0 10px ${c.clr}` }} />
              <span className={styles.icon}>{c.icon}</span>
              <h4>{c.title}</h4>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
