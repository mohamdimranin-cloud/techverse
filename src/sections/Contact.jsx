import styles from './Contact.module.css'

const phones = ['+91 91870 13749', '+91 78928 56055', '+91 73871 71523']

export default function Contact() {
  return (
    <section className="section" id="contact">
      <div className="container">
        <p className="section-tag">📞 Get in Touch</p>
        <h2 className="section-title">Contact Us</h2>
        <div className={styles.grid}>
          <div className={`glass-card ${styles.card}`}>
            <span>📧</span>
            <div>
              <h4>Email</h4>
              <p>techverse@bitmangalore.edu.in</p>
            </div>
          </div>
          <div className={`glass-card ${styles.card}`}>
            <span>📱</span>
            <div>
              <h4>Phone</h4>
              {phones.map(p => <p key={p}>{p}</p>)}
            </div>
          </div>
          <div className={`glass-card ${styles.card}`}>
            <span>📍</span>
            <div>
              <h4>Location</h4>
              <a href="https://maps.app.goo.gl/YoXSCiPujxQAupR76" target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                Bearys Institute of Technology, Mangalore
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
