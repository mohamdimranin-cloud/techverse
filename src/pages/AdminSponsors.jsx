import { useState, useEffect } from 'react'
import { fetchSponsors, addSponsor, editSponsor, deleteSponsorAPI } from '../api/client'
import styles from './AdminSponsors.module.css'

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState([])
  const [modal, setModal] = useState(null)
  const [name, setName] = useState('')
  const [preview, setPreview] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const reload = () => fetchSponsors().then(setSponsors)
  useEffect(() => { reload() }, [])

  const openAdd = () => { setModal('add'); setName(''); setPreview(null); setImageData(null) }
  const openEdit = (s) => { setModal(s); setName(s.name); setPreview(s.image_data); setImageData(null) }
  const closeModal = () => { setModal(null); setName(''); setPreview(null); setImageData(null) }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setImageData(reader.result); setPreview(reader.result) }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!name.trim()) return alert('Please enter a sponsor name')
    if (modal === 'add') {
      if (!imageData) return alert('Please upload an image')
      await addSponsor(name.trim(), imageData)
    } else {
      await editSponsor(modal.id, name.trim(), imageData)
    }
    reload(); closeModal()
  }

  const handleDelete = async (id) => {
    await deleteSponsorAPI(id)
    reload(); setConfirmDel(null)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>🤝 Sponsors & Partners</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Sponsor</button>
      </div>
      {sponsors.length === 0 ? (
        <p className={styles.empty}>No sponsors added yet.</p>
      ) : (
        <div className={styles.grid}>
          {sponsors.map(s => (
            <div key={s.id} className={`glass-card ${styles.card}`}>
              <img src={s.image_data} alt={s.name} className={styles.img} />
              <p className={styles.name}>{s.name}</p>
              <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => openEdit(s)}>✏️ Edit</button>
                <button className={styles.delBtn} onClick={() => setConfirmDel(s.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={`glass-card ${styles.modal}`} onClick={e => e.stopPropagation()}>
            <h3>{modal === 'add' ? 'Add Sponsor' : 'Edit Sponsor'}</h3>
            <div className={styles.field}>
              <label>Name *</label>
              <input type="text" placeholder="e.g. Lead Tech" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{modal === 'add' ? 'Logo *' : 'Replace Logo (optional)'}</label>
              <label className={styles.uploadBox}>
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                {preview ? <img src={preview} alt="preview" className={styles.previewImg} />
                  : <div className={styles.uploadPrompt}><span>📁</span><p>Click to upload</p></div>}
              </label>
            </div>
            <div className={styles.modalBtns}>
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Add' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmDel && (
        <div className={styles.overlay} onClick={() => setConfirmDel(null)}>
          <div className={`glass-card ${styles.modal}`} onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3>Remove Sponsor?</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>This cannot be undone.</p>
            <div className={styles.modalBtns}>
              <button className="btn btn-outline" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn" style={{ background: '#f87171', color: '#fff' }} onClick={() => handleDelete(confirmDel)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
