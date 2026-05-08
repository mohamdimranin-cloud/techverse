import { useState, useEffect, useRef } from 'react'
import styles from './Hint.module.css'

const questions = [
  { id: 'hometown', label: 'Home town', placeholder: 'Find someone from the same hometown' },
  { id: 'food', label: 'Favourite food', placeholder: 'Find someone who loves the same food' },
  { id: 'ipl', label: 'Favourite IPL team', placeholder: 'Find a fellow fan' },
  { id: 'language', label: 'Mother tongue', placeholder: 'Find someone who speaks your language' },
  { id: 'beverage', label: 'Chai ya coffee?', placeholder: 'Find your beverage buddy' },
  { id: 'series', label: 'Favourite series', placeholder: 'Find someone who binges the same show' },
  { id: 'actor', label: 'Favourite actor', placeholder: 'Find someone who shares your favorite' },
  { id: 'genre', label: 'Genre in movies', placeholder: 'Find someone with the same taste' },
  { id: 'letter', label: 'Name starting from same letter', placeholder: 'Find someone whose name starts with your letter' },
  { id: 'vacation', label: 'Beach or mountain?', placeholder: 'Find your travel buddy' },
]

export default function Hint() {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState({})
  const [uploading, setUploading] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'
    console.log('Fetching teams from:', `${apiUrl}/api/hint-teams`)
    console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL)
    
    fetch(`${apiUrl}/api/hint-teams`)
      .then(r => {
        console.log('Response status:', r.status)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        console.log('Teams data received:', data.length, 'teams')
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format')
        }
        setTeams(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching teams:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleTeamChange = (teamId) => {
    setSelectedTeam(teamId)
    setSelectedMember('')
    setName('')
    setSubmitted({})
  }

  const handleMemberChange = (memberId) => {
    setSelectedMember(memberId)
    const team = teams.find(t => t.id === selectedTeam)
    const member = team?.members?.find(m => m.id === memberId)
    if (member) {
      setName(member.name)
      // Fetch previous submissions for this user
      fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/hint-responses/${encodeURIComponent(member.name)}`)
        .then(r => r.json())
        .then(data => {
          const submittedQuestions = {}
          data.forEach(response => {
            submittedQuestions[response.question_id] = true
          })
          setSubmitted(submittedQuestions)
        })
        .catch(() => {})
    }
  }

  const currentTeam = teams.find(t => t.id === selectedTeam)
  const members = currentTeam?.members || []

  const handleSubmit = async (questionId, matchName, photo, description) => {
    if (!name) {
      alert('Please select your team and name first')
      return
    }
    if (!matchName) {
      alert('Please enter who you found a match with')
      return
    }
    if (!photo) {
      alert('Please upload a selfie with your match')
      return
    }

    setUploading(prev => ({ ...prev, [questionId]: true }))

    const formData = new FormData()
    formData.append('name', name)
    formData.append('questionId', questionId)
    formData.append('matchName', matchName)
    formData.append('description', description || '')
    formData.append('photo', photo)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/hint-submit`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(prev => ({ ...prev, [questionId]: true }))
      } else {
        alert(data.error || 'Submission failed')
      }
    } catch (err) {
      alert('Network error: ' + err.message)
    } finally {
      setUploading(prev => ({ ...prev, [questionId]: false }))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Ohh!! Same here</h1>
          <p className={styles.sub}>Find someone who shares your answer to each question, take a selfie together!</p>
        </div>

        <div className={`glass-card ${styles.infoCard}`}>
          <h3>Who are you?</h3>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#22d3ee' }}>Loading teams...</p>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#ef4444', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                ❌ Error loading teams
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {error}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
                Check browser console (F12) for details
              </p>
            </div>
          ) : teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#f59e0b', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                ⚠️ No shortlisted teams found
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                This game is only available for shortlisted teams. Please wait for the shortlist announcement.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.row}>
                <select 
                  value={selectedTeam} 
                  onChange={e => {
                    console.log('Team selected:', e.target.value)
                    handleTeamChange(e.target.value)
                  }} 
                  className={styles.select}
                >
                  <option value="">Select Your Team * ({teams.length} teams)</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.team_name}</option>
                  ))}
                </select>
                <select 
                  value={selectedMember} 
                  onChange={e => {
                    console.log('Member selected:', e.target.value)
                    handleMemberChange(e.target.value)
                  }} 
                  className={styles.select} 
                  disabled={!selectedTeam}
                >
                  <option value="">Select Your Name *</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              {name && (
                <div className={styles.selectedInfo}>
                  <p>✓ Playing as: <strong>{name}</strong></p>
                </div>
              )}
            </>
          )}
        </div>

        {name && (
          <div className={styles.questions}>
            {questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                submitted={submitted[q.id]}
                uploading={uploading[q.id]}
                onSubmit={handleSubmit}
              />
            ))}
          </div>
        )}

        {name && Object.keys(submitted).length === questions.length && (
          <div className={`glass-card ${styles.successCard}`}>
            <p className={styles.successIcon}>🎉</p>
            <p className={styles.successMsg}>All matches found! Great job connecting!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question, submitted, uploading, onSubmit }) {
  const [matchName, setMatchName] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Max 5MB.')
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      })
      setStream(mediaStream)
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      alert('Camera access denied or not available')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  const handleSubmitClick = () => {
    onSubmit(question.id, matchName, photo, description)
  }

  if (submitted) {
    return (
      <div className={`glass-card ${styles.questionCard} ${styles.submitted}`}>
        <h4>{question.label}</h4>
        <p className={styles.submittedMsg}>✓ Match Found!</p>
      </div>
    )
  }

  return (
    <div className={`glass-card ${styles.questionCard}`}>
      <h4>{question.label}</h4>
      <p className={styles.instruction}>{question.placeholder}</p>
      <input
        type="text"
        placeholder="Who did you find? (Their name)"
        value={matchName}
        onChange={e => setMatchName(e.target.value)}
        className={styles.input}
      />
      <textarea
        placeholder="Describe your match moment (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className={styles.textarea}
        rows={2}
      />
      
      {showCamera ? (
        <div className={styles.cameraBox}>
          <video ref={videoRef} autoPlay playsInline className={styles.video} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className={styles.cameraButtons}>
            <button type="button" className="btn btn-primary" onClick={capturePhoto}>
              📸 Capture
            </button>
            <button type="button" className="btn btn-outline" onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      ) : photoPreview ? (
        <div className={styles.photoPreview}>
          <img src={photoPreview} alt="Preview" />
          <div className={styles.photoActions}>
            <span className={styles.photoName}>{photo.name}</span>
            <button type="button" className={styles.retakeBtn} onClick={() => { setPhoto(null); setPhotoPreview(null) }}>
              🗑 Remove
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.photoOptions}>
          <button type="button" className={styles.photoOptionBtn} onClick={startCamera}>
            <span>📷</span>
            <p>Take Selfie</p>
          </button>
          <label className={styles.photoOptionBtn}>
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <span>🖼️</span>
            <p>Upload Photo</p>
          </label>
        </div>
      )}
      
      <button
        className="btn btn-primary"
        onClick={handleSubmitClick}
        disabled={uploading || !matchName || !photo}
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        {uploading ? 'Submitting...' : 'Submit Match'}
      </button>
    </div>
  )
}
