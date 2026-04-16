import styles from './WhyJoin.module.css'

const gains = [
  { icon: '', text: 'Real World Problem Exposure' },
  { icon: '', text: 'Evaluation by Faculty & Domain Experts' },
  { icon: '', text: 'Direct Mentorship During the Build Phase' },
  { icon: '', text: 'Path to Investors & Government Presentation' },
]

export default function WhyJoin() {
  return (
    <section className="section section-alt" id="why">
      <div className="container">
        <p className="section-tag">Benefits</p>
        <h2 className="section-title">What Participants Gain</h2>
        <div className={styles.grid}>
          {gains.map(g => (
            <div key={g.text} className={`glass-card ${styles.card}`}>
              <span>{g.icon}</span>
              <p>{g.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
