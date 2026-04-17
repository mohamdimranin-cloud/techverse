import styles from './Rules.module.css'

const slides = [
  { n: '01', title: 'Team Name & Members', desc: 'Introduce your team — names, roles, and college.' },
  { n: '02', title: 'Theme & Problem Statement', desc: 'State the theme chosen and clearly define the problem you are solving.' },
  { n: '03', title: 'Solution Overview', desc: 'Explain your proposed solution and how it addresses the problem.' },
  { n: '04', title: 'Diagrams & Flowcharts', desc: 'Visual representation of your system architecture or workflow.' },
  { n: '05', title: 'Future Scope', desc: 'How can your solution scale or evolve in the future?' },
  { n: '06–08', title: 'Extra Slides', desc: 'Optional slides for additional details, references, or demos.' },
]

export default function Rules() {
  return (
    <section className="section" id="rules">
      <div className="container">
        <p className="section-tag">Guidelines</p>
        <h2 className="section-title">Rules & Guidelines</h2>

        <div className={styles.roundTag}>Round 1 — PPT Submission</div>

        <div className={styles.note}>
          Minimum <strong>5 slides</strong> · Maximum <strong>8 slides</strong>
        </div>

        <div className={styles.list}>
          {slides.map(s => (
            <div key={s.n} className={`glass-card ${styles.item}`}>
              <span className={styles.num}>{s.n}</span>
              <div>
                <h4 className={styles.title}>{s.title}</h4>
                <p className={styles.desc}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
