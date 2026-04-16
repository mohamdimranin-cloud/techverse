import styles from './Footer.module.css'

const phones = ['+91 91870 13749', '+91 78928 56055', '+91 73871 71523']

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <p className={styles.name}>TechVerse 2026</p>
          <p className={styles.sub}>Bearys Institute of Technology, Mangalore</p>
        </div>

        <div className={styles.contact}>
          <div className={styles.contactItem}>
            <span className={styles.label}>Email</span>
            <a href="mailto:techverse@bitmangalore.edu.in">techverse@bitmangalore.edu.in</a>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.label}>Phone</span>
            {phones.map(p => <span key={p}>{p}</span>)}
          </div>
          <div className={styles.contactItem}>
            <span className={styles.label}>Location</span>
            <a href="https://maps.app.goo.gl/YoXSCiPujxQAupR76" target="_blank" rel="noopener noreferrer">
              View on Maps
            </a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© 2026 TechVerse Hackathon · Built with love by the TechVerse Team</p>
      </div>
    </footer>
  )
}
