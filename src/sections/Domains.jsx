import styles from './Domains.module.css'

const themes = [
  {
    name: 'Rural Tech',
    color: '#fbbf24',
    domains: [
      { icon: '🌾', title: 'Agritech', desc: 'Innovate farming, supply chains, and food systems using smart technology.' },
      { icon: '🐟', title: 'Fisheries & Coastal Solutions', desc: 'Build solutions for sustainable fishing, marine ecosystems, and coastal communities.' },
    ]
  },
  {
    name: 'MedTech',
    color: '#f9a8d4',
    domains: [
      { icon: '🏥', title: 'Health Technology', desc: 'Transform healthcare delivery, diagnostics, and patient outcomes through tech.' },
    ]
  },
  {
    name: 'Future Tech',
    color: '#7dd3fc',
    domains: [
      { icon: '🔐', title: 'Cybersecurity', desc: 'Hack ethically, defend systems, and build tools that protect the digital universe.' },
      { icon: '⚡', title: 'Energy Conservation & Digitization', desc: 'Drive smart energy solutions, automation, and digital transformation in power systems.' },
    ]
  },
]

export default function Domains() {
  return (
    <section className="section" id="domains">
      <div className="container">
        <p className="section-tag">Domains</p>
        <h2 className="section-title">Choose Your Planet</h2>
        
        {themes.map(theme => (
          <div key={theme.name} className={styles.themeBlock}>
            <h3 className={styles.themeName} style={{ color: theme.color }}>{theme.name}</h3>
            <div className={styles.grid}>
              {theme.domains.map(d => (
                <div key={d.title} className={`glass-card ${styles.card}`} style={{ '--clr': theme.color }}>
                  <div className={styles.planet}>{d.icon}</div>
                  <h4>{d.title}</h4>
                  <p>{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className={styles.openNote}>
          Strong ideas that push boundaries are welcome across all themes.
        </p>
      </div>
    </section>
  )
}
