import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { submitRegistration, notifyRegistration, uploadPptToCloudinary } from '../api/client'
import styles from './Register.module.css'

const DOMAINS = [
  'Agritech',
  'Fisheries & Coastal Solutions',
  'Health Technology',
  'Cybersecurity',
  'Energy Automation & Digitalisation',
  'Green & Sustainable Development',
  'Open Category',
]

const UPI_ID = '7760543128@ibl'
const UPI_NAME = 'TechVerse Hackathon'
const FEE_PER_PERSON = 250

const emptyMember = { name: '', email: '', phone: '', role: '' }
const STEPS = ['Team Info', 'Members', 'Project', 'Payment']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [pptFile, setPptFile] = useState(null)
  const [pptError, setPptError] = useState('')
  const [pptMode, setPptMode] = useState('upload') // 'upload' | 'link'
  const [txnId, setTxnId] = useState('')

  const [form, setForm] = useState({
    teamName: '',
    domain: '',
    college: '',
    teamSize: 2,
    members: [{ ...emptyMember }, { ...emptyMember }],
    projectTitle: '',
    projectDesc: '',
    agreeTerms: false,
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const setMember = (i, key, val) =>
    setForm(f => {
      const members = [...f.members]
      members[i] = { ...members[i], [key]: val }
      return { ...f, members }
    })

  const handleTeamSize = (size) => {
    const n = Number(size)
    setForm(f => ({
      ...f, teamSize: n,
      members: Array.from({ length: n }, (_, i) => f.members[i] || { ...emptyMember }),
    }))
  }

  const handlePpt = (e) => {
    const file = e.target.files[0]
    setPptError('')
    if (!file) return
    const allowed = ['application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    if (!allowed.includes(file.type) && !file.name.match(/\.(ppt|pptx)$/i)) {
      setPptError('Only .ppt or .pptx files are allowed')
      setPptFile(null); return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPptError(`❌ File too large (${(file.size/1024/1024).toFixed(1)}MB). Maximum is 10MB. Please compress or use the link option.`)
      setPptFile(null); return
    }
    setPptFile(file)
  }

  const validateStep = () => {
    const e = {}
    if (step === 1) {
      if (!form.teamName.trim()) e.teamName = 'Team name is required'
      if (!form.domain) e.domain = 'Please select a domain'
      if (!form.college.trim()) e.college = 'College name is required'
    }
    if (step === 2) {
      form.members.forEach((m, i) => {
        if (!m.name.trim()) e[`m${i}name`] = 'Name required'
        if (!m.email.trim() || !/\S+@\S+\.\S+/.test(m.email)) e[`m${i}email`] = 'Valid email required'
        if (!m.phone.trim() || !/^\d{10}$/.test(m.phone)) e[`m${i}phone`] = '10-digit phone required'
      })
    }
    if (step === 3) {
      if (!form.projectTitle.trim()) e.projectTitle = 'Project title is required'
      if (form.projectDesc.trim().length < 50) e.projectDesc = 'Describe your project (min 50 chars)'
      if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms'
    }
    if (step === 4) {
      if (!txnId.trim()) e.txnId = 'Please enter your UPI transaction ID after payment'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep()) return

    const result = await submitRegistration({
      ...form,
      txnId,
      ppt: pptFile ? { name: pptFile.name, size: pptFile.size } : null,
      pptLink: form.pptLink || null,
    })

    if (!result.id) { alert('Registration failed. Please try again.'); return }

    // Upload PPT to Cloudinary if file selected
    if (pptFile && pptMode === 'upload') {
      try {
        await uploadPptToCloudinary(pptFile, result.id)
      } catch (err) {
        console.error('PPT upload failed:', err.message)
      }
    }

    // No PPT file upload needed - using Google Drive link
    notifyRegistration({ teamName: form.teamName, members: form.members, domain: form.domain, projectTitle: form.projectTitle, txnId })

    navigate('/register/success', { state: { teamName: form.teamName, id: result.id, ticketId: result.ticketId } })
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className="section-tag">🚀 Join the Universe</p>
          <h1 className={styles.title}>Register Your Team</h1>
          <p className={styles.sub}>Step into the TechVerse. Code the Future. Shape the Universe.</p>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((label, i) => (
            <div key={label}
              className={`${styles.stepItem} ${step === i + 1 ? styles.active : ''} ${step > i + 1 ? styles.done : ''}`}>
              <div className={styles.stepCircle}>{step > i + 1 ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={`glass-card ${styles.formCard}`}>

            {/* STEP 1 — Team Info */}
            {step === 1 && (
              <div className={styles.stepContent}>
                <h2 className={styles.stepTitle}>Team Information</h2>
                <div className={styles.field}>
                  <label>Team Name *</label>
                  <input type="text" placeholder="e.g. Quantum Coders"
                    value={form.teamName} onChange={e => set('teamName', e.target.value)}
                    className={errors.teamName ? styles.inputError : ''} />
                  {errors.teamName && <span className={styles.error}>{errors.teamName}</span>}
                </div>
                <div className={styles.field}>
                  <label>Domain *</label>
                  <select value={form.domain} onChange={e => set('domain', e.target.value)}
                    className={errors.domain ? styles.inputError : ''}>
                    <option value="">Select a domain</option>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.domain && <span className={styles.error}>{errors.domain}</span>}
                </div>
                <div className={styles.field}>
                  <label>College / Institution *</label>
                  <input type="text" placeholder="e.g. Bearys Institute of Technology"
                    value={form.college} onChange={e => set('college', e.target.value)}
                    className={errors.college ? styles.inputError : ''} />
                  {errors.college && <span className={styles.error}>{errors.college}</span>}
                </div>
                <div className={styles.field}>
                  <label>Team Size *</label>
                  <div className={styles.sizeGroup}>
                    {[2, 3, 4].map(n => (
                      <button key={n} type="button"
                        className={`${styles.sizeBtn} ${form.teamSize === n ? styles.sizeBtnActive : ''}`}
                        onClick={() => handleTeamSize(n)}>{n} Members</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Members */}
            {step === 2 && (
              <div className={styles.stepContent}>
                <h2 className={styles.stepTitle}>Team Members</h2>
                {form.members.map((m, i) => (
                  <div key={i} className={styles.memberBlock}>
                    <h3 className={styles.memberHeading}>{i === 0 ? '👑 Team Leader' : `👤 Member ${i + 1}`}</h3>
                    <div className={styles.row}>
                      <div className={styles.field}>
                        <label>Full Name *</label>
                        <input type="text" placeholder="Full name" value={m.name}
                          onChange={e => setMember(i, 'name', e.target.value)}
                          className={errors[`m${i}name`] ? styles.inputError : ''} />
                        {errors[`m${i}name`] && <span className={styles.error}>{errors[`m${i}name`]}</span>}
                      </div>
                      <div className={styles.field}>
                        <label>Email *</label>
                        <input type="email" placeholder="email@example.com" value={m.email}
                          onChange={e => setMember(i, 'email', e.target.value)}
                          className={errors[`m${i}email`] ? styles.inputError : ''} />
                        {errors[`m${i}email`] && <span className={styles.error}>{errors[`m${i}email`]}</span>}
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.field}>
                        <label>Phone *</label>
                        <input type="tel" placeholder="10-digit number" value={m.phone}
                          onChange={e => setMember(i, 'phone', e.target.value)}
                          className={errors[`m${i}phone`] ? styles.inputError : ''} />
                        {errors[`m${i}phone`] && <span className={styles.error}>{errors[`m${i}phone`]}</span>}
                      </div>
                      <div className={styles.field}>
                        <label>Role</label>
                        <input type="text" placeholder="e.g. Frontend Dev, ML Engineer" value={m.role}
                          onChange={e => setMember(i, 'role', e.target.value)}
                          className={errors[`m${i}role`] ? styles.inputError : ''} />
                        {errors[`m${i}role`] && <span className={styles.error}>{errors[`m${i}role`]}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3 — Project */}
            {step === 3 && (
              <div className={styles.stepContent}>
                <h2 className={styles.stepTitle}>Project Details</h2>
                <div className={styles.field}>
                  <label>Project Title *</label>
                  <input type="text" placeholder="Give your project a name"
                    value={form.projectTitle} onChange={e => set('projectTitle', e.target.value)}
                    className={errors.projectTitle ? styles.inputError : ''} />
                  {errors.projectTitle && <span className={styles.error}>{errors.projectTitle}</span>}
                </div>
                <div className={styles.field}>
                  <label>Project Description * <span className={styles.hint}>(min 50 chars)</span></label>
                  <textarea rows={4} placeholder="Describe your idea, the problem it solves, and your approach..."
                    value={form.projectDesc} onChange={e => set('projectDesc', e.target.value)}
                    className={errors.projectDesc ? styles.inputError : ''} />
                  <span className={styles.charCount}>{form.projectDesc.length} chars</span>
                  {errors.projectDesc && <span className={styles.error}>{errors.projectDesc}</span>}
                </div>
                <div className={styles.field}>
                  <label>Presentation <span className={styles.hint}>(optional)</span></label>

                  {/* Toggle */}
                  <div className={styles.pptToggle}>
                    <button type="button"
                      className={`${styles.toggleBtn} ${pptMode === 'upload' ? styles.toggleActive : ''}`}
                      onClick={() => { setPptMode('upload'); set('pptLink', ''); setPptError('') }}>
                      📤 Upload File
                    </button>
                    <button type="button"
                      className={`${styles.toggleBtn} ${pptMode === 'link' ? styles.toggleActive : ''}`}
                      onClick={() => { setPptMode('link'); setPptFile(null); setPptError('') }}>
                      🔗 Share Link
                    </button>
                  </div>

                  {pptMode === 'upload' && (
                    <>
                      <p className={styles.pptNote}>⚠️ Max file size: <strong>10MB</strong>. Files above 10MB will be rejected.</p>
                      <label className={`${styles.uploadBox} ${pptFile ? styles.uploadDone : ''}`}>
                        <input type="file" accept=".ppt,.pptx" onChange={handlePpt} style={{ display: 'none' }} />
                        {pptFile ? (
                          <div className={styles.uploadedFile}>
                            <span>📊</span>
                            <div>
                              <p className={styles.fileName}>{pptFile.name}</p>
                              <p className={styles.fileSize}>{(pptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <span className={styles.checkMark}>✓</span>
                          </div>
                        ) : (
                          <div className={styles.uploadPrompt}>
                            <span>📤</span>
                            <p>Click to upload .ppt or .pptx</p>
                            <p className={styles.hint}>Max 10MB</p>
                          </div>
                        )}
                      </label>
                    </>
                  )}

                  {pptMode === 'link' && (
                    <>
                      <p className={styles.pptNote}>📁 Upload to Google Drive → Share → Anyone with link → Paste below</p>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={form.pptLink || ''}
                        onChange={e => set('pptLink', e.target.value)}
                      />
                    </>
                  )}

                  {pptError && <span className={styles.error}>{pptError}</span>}
                </div>
                <div className={styles.summary}>
                  <h3>Registration Summary</h3>
                  <div className={styles.summaryGrid}>
                    <span>Team</span><span>{form.teamName}</span>
                    <span>Domain</span><span>{form.domain}</span>
                    <span>College</span><span>{form.college}</span>
                    <span>Members</span><span>{form.teamSize}</span>
                    <span>PPT</span><span>{pptFile ? `📤 ${pptFile.name}` : form.pptLink ? '🔗 Link provided' : 'Not provided'}</span>
                  </div>
                </div>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.agreeTerms}
                    onChange={e => set('agreeTerms', e.target.checked)} />
                  <span>I agree to the TechVerse rules and code of conduct</span>
                </label>
                {errors.agreeTerms && <span className={styles.error}>{errors.agreeTerms}</span>}
              </div>
            )}

            {/* STEP 4 — Payment */}
            {step === 4 && (
              <div className={styles.stepContent}>
                <h2 className={styles.stepTitle}>Payment</h2>
                {(() => {
                  const totalAmount = form.teamSize * FEE_PER_PERSON
                  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('TechVerse 2026 Registration')}`
                  return (
                    <div className={styles.paymentBox}>
                      <div className={styles.feeBreakdown}>
                        <div className={styles.feeRow}>
                          <span>Fee per person</span>
                          <span>₹{FEE_PER_PERSON}</span>
                        </div>
                        <div className={styles.feeRow}>
                          <span>Team size</span>
                          <span>{form.teamSize} members</span>
                        </div>
                        <div className={`${styles.feeRow} ${styles.feeTotal}`}>
                          <span>Total Amount</span>
                          <span className={styles.feeAmount}>₹{totalAmount}</span>
                        </div>
                      </div>

                      <div className={styles.qrWrap}>
                        <QRCodeSVG
                          value={upiUrl}
                          size={200}
                          bgColor="transparent"
                          fgColor="#e2e8f0"
                          level="H"
                        />
                        <p className={styles.qrHint}>Scan with Google Pay, PhonePe, Paytm or any UPI app</p>
                      </div>

                      <div className={styles.upiRow}>
                        <span className={styles.upiLabel}>UPI ID</span>
                        <span className={styles.upiId}>{UPI_ID}</span>
                        <button type="button" className={styles.copyBtn}
                          onClick={() => navigator.clipboard.writeText(UPI_ID)}>
                          Copy
                        </button>
                      </div>

                      <div className={styles.upiApps}>
                        <a href={`upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('TechVerse 2026 Registration')}`}
                          className={`${styles.appBtn} ${styles.gpay}`}
                          onClick={e => { if (!/android|iphone|ipad/i.test(navigator.userAgent)) { e.preventDefault(); alert('UPI app links only work on mobile. Please scan the QR code above or manually enter the UPI ID.') } }}>
                          <img src="/payment/google-pay.png" alt="Google Pay" width="28" height="28" style={{ objectFit: 'contain' }} />
                          <span>Google Pay</span>
                        </a>
                        <a href={`upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('TechVerse 2026 Registration')}`}
                          className={`${styles.appBtn} ${styles.phonepe}`}
                          onClick={e => { if (!/android|iphone|ipad/i.test(navigator.userAgent)) { e.preventDefault(); alert('UPI app links only work on mobile. Please scan the QR code above or manually enter the UPI ID.') } }}>
                          <img src="/payment/icons8-phone-pe.svg" alt="PhonePe" width="28" height="28" style={{ objectFit: 'contain' }} />
                          <span>PhonePe</span>
                        </a>
                        <a href={`upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${totalAmount}&cu=INR`}
                          className={`${styles.appBtn} ${styles.upiGeneric}`}
                          onClick={e => { if (!/android|iphone|ipad/i.test(navigator.userAgent)) { e.preventDefault(); alert('UPI app links only work on mobile. Please scan the QR code above or manually enter the UPI ID.') } }}>
                          💳 Any UPI App
                        </a>
                      </div>
                      <p className={styles.desktopNote}>📱 On mobile? Tap above to open your UPI app directly. On desktop, scan the QR code.</p>

                      <div className={styles.field} style={{ width: '100%', marginTop: '0.5rem' }}>
                        <label>UPI Transaction ID * <span className={styles.hint}>(enter after payment)</span></label>
                        <input
                          type="text"
                          placeholder="e.g. 123456789012"
                          value={txnId}
                          onChange={e => setTxnId(e.target.value)}
                          className={errors.txnId ? styles.inputError : ''}
                        />
                        {errors.txnId && <span className={styles.error}>{errors.txnId}</span>}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className={styles.nav}>
              {step > 1 && <button type="button" className="btn btn-outline" onClick={back}>← Back</button>}
              {step < 4 && <button type="button" className="btn btn-primary" onClick={next}>Next →</button>}
              {step === 4 && <button type="submit" className="btn btn-primary">🚀 Submit Registration</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
