import { useState, useEffect } from 'react'
import { fetchRegistrations, downloadPptAPI } from '../api/client'
import styles from './AdminPPT.module.css'

export default function AdminPPT() {
  const [registrations, setRegistrations] = useState([])
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    fetchRegistrations().then(rows => {
      setRegistrations(rows.map(r => ({
        ...r,
        teamName: r.team_name || r.teamName,
        pptName: r.ppt_name || r.ppt?.name,
        pptUrl: r.ppt_url,
        domain: r.domain,
        college: r.college,
      })).filter(r => r.pptName))
    })
  }, [])

  const filtered = registrations.filter(r => {
    const q = search.toLowerCase()
    return !q || r.teamName?.toLowerCase().includes(q) || r.pptName?.toLowerCase().includes(q)
  })

  const handleDownload = async (reg) => {
    setDownloading(reg.id)
    try {
      if (reg.pptUrl) {
        const res = await fetch(reg.pptUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = reg.pptName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const data = await downloadPptAPI(reg.id)
        if (data?.url) {
          const res = await fetch(data.url)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = reg.pptName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } else {
          alert('PPT file not available.')
        }
      }
    } catch (e) {
      alert('Download failed: ' + e.message)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>📊 PPT Submissions</h2>
        <span className={styles.count}>{registrations.length} files uploaded</span>
      </div>

      <input
        type="text"
        placeholder="🔍 Search by team or filename..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={styles.search}
      />

      {filtered.length === 0 ? (
        <p className={styles.empty}>No PPT submissions yet.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(r => (
            <div key={r.id} className={`glass-card ${styles.item}`}>
              <div className={styles.icon}>📊</div>
              <div className={styles.info}>
                <p className={styles.teamName}>{r.teamName}</p>
                <p className={styles.fileName}>{r.pptName}</p>
                <p className={styles.meta}>{r.domain} · {r.college}</p>
                <p className={styles.status} style={{ color: r.pptUrl ? '#10b981' : '#f59e0b' }}>
                  {r.pptUrl ? '✅ Uploaded to Cloudinary' : '⚠️ Metadata only (no file)'}
                </p>
              </div>
              <button
                className={`btn btn-outline ${styles.dlBtn}`}
                onClick={() => handleDownload(r)}
                disabled={downloading === r.id || !r.pptUrl}
              >
                {downloading === r.id ? '⏳' : '⬇ Download'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
