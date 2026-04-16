import styles from './Domains.module.css'

const domains = [
  { icon: '', title: 'Agritech', desc: 'Innovate farming, supply chains, and food systems using smart technology.', clr: '#10b981' },
  { icon: '', title: 'Fisheries & Coastal Solutions', desc: 'Build solutions for sustainable fishing, marine ecosystems, and coastal communities.', clr: '#0ea5e9' },
  { icon: '', title: 'Health Technology', desc: 'Transform healthcare delivery, diagnostics, and patient outcomes through tech.', clr: '#ec4899' },
  { icon: '', title: 'Cybersecurity', desc: 'Hack ethically, defend systems, and build tools that protect the digital universe.', clr: '#f59e0b' },
  { icon: '', title: 'Energy Automation & Digitalisation', desc: 'Drive smart energy solutions, automation, and digital transformation in power systems.', clr: '#a855f7' },
  { icon: '', title: 'Green & Sustainable Development', desc: 'Create impactful solutions for climate, environment, and a sustainable future.', clr: '#22d3ee' },
]

export default function Domains() {
  return (
    <section className="section" id="domains">
      <div className="container">
        <p className="section-tag">Domains</p>
        <h2 className="section-title">Choose Your Planet</h2>
        <div className={styles.grid}>
          {domains.map(d => (
            <div key={d.title} className={`glass-card ${styles.card}`} style={{ '--clr': d.clr }}>
              <div className={styles.planet}>{d.icon}</div>
              <h3>{d.title}</h3>
            </div>
          ))}
        </div>
        <p className={styles.openNote}>
          <strong>Open Category:</strong> Strong ideas outside these domains are welcome.
        </p>
      </div>
    </section>
  )
}
