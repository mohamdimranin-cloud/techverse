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
      <Link to="/" className={styles.logo}>TechVerse</Link>
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
