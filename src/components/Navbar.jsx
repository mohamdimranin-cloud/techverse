import { Link, useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'

const links = [
  { href: '/#about', label: 'About' },
  { href: '/#domains', label: 'Domains' },
  { href: '/#timeline', label: 'Timeline' },
  { href: '/#prizes', label: 'Prizes' },
  { href: '/#contact', label: 'Contact' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoIcon}>
          <path d="M12 2C12 2 7 6 7 13H17C17 6 12 2 12 2Z" fill="url(#rg)"/>
          <path d="M9 13V17C9 18.1 9.9 19 11 19H13C14.1 19 15 18.1 15 17V13H9Z" fill="url(#rg)"/>
          <circle cx="12" cy="10" r="2" fill="#020817"/>
          <path d="M9 17L7 21H9L10 19" fill="url(#rg)"/>
          <path d="M15 17L17 21H15L14 19" fill="url(#rg)"/>
          <defs>
            <linearGradient id="rg" x1="7" y1="2" x2="17" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa"/>
              <stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
        TechVerse
      </Link>
      <ul className={styles.links}>
        {links.map(l => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
      <Link to="/register" className={`btn btn-primary ${styles.cta}`}>
        Register Now
      </Link>
    </nav>
  )
}
