import { useState } from 'react'
import styles from './Hint.module.css'

const questions = [
  { id: 'hometown', label: 'Home town', placeholder: 'Where are you from?' },
  { id: 'food', label: 'Favourite food', placeholder: 'What do you love to eat?' },
  { id: 'ipl', label: 'Favourite IPL team', placeholder: 'Which team do you support?' },
  { id: 'language', label: 'Mother tongue', placeholder: 'Your native language?' },
  { id: 'beverage', label: 'Chai ya coffee?', placeholder: 'Pick your poison' },
  { id: 'series', label: 'Favourite series', placeholder: 'What do you binge-watch?' },
  { id: 'actor', label: 'Favourite actor', placeholder: 'Who inspires you?' },
  { id: 'genre', label: 'Genre in movies', placeholder: 'Action, Romance, Thriller...?' },
  { id: 'letter', label: 'Name starting from same letter', placeholder: 'Someone whose name starts with your first letter' },
  { id: 'vacation', label: 'Beach or mountain?', placeholder: 'Where would you go?' },
]

export default function Hint() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState({})
  const [uploading, setUploading] = useState({})

  const handleSubmit = async (questionId, answer, photo, description) => {
    if (!name || !email || !phone) {
      alert('Please fill in your name, email, and phone first')
      return
    }
    if (!answer) {
      alert('Please provide an answer')
      return
    }

    setUploading(prev => ({ ...prev, [questionId]: true }))

    const formData = new FormData()
    formData.append('name', name)
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('questionId', questionId)
    formData.append('answer', answer)
    formData.append('description', description || '')
    if (photo) formData.append('photo', photo)

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
          <h1 className={styles.title}>🎯 Get to Know You</h1>
          <p className={styles.sub}>Share a bit about yourself — let's break the ice!</p>
        </div>

        <div className={`glass-card ${styles.infoCard}`}>
          <h3>Your Details</h3>
          <div className={styles.row}>
            <input type="text" placeholder="Your Name *" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="tel" placeholder="Phone *" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>

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

        {Object.keys(submitted).length === questions.length && (
          <div className={`glass-card ${styles.successCard}`}>
            <p className={styles.successIcon}>🎉</p>
            <p className={styles.successMsg}>All done! Thanks for sharing.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question, submitted, uploading, onSubmit }) {
  const [answer, setAnswer] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

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

  const handleSubmitClick = () => {
    onSubmit(question.id, answer, photo, description)
  }

  if (submitted) {
    return (
      <div className={`glass-card ${styles.questionCard} ${styles.submitted}`}>
        <h4>{question.label}</h4>
        <p className={styles.submittedMsg}>✓ Submitted</p>
      </div>
    )
  }

  return (
    <div className={`glass-card ${styles.questionCard}`}>
      <h4>{question.label}</h4>
      <input
        type="text"
        placeholder={question.placeholder}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        className={styles.input}
      />
      <textarea
        placeholder="Add a description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className={styles.textarea}
        rows={2}
      />
      <label className={styles.photoLabel}>
        <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        {photoPreview ? (
          <div className={styles.photoPreview}>
            <img src={photoPreview} alt="Preview" />
            <span className={styles.photoName}>{photo.name}</span>
          </div>
        ) : (
          <div className={styles.photoPrompt}>
            <span>📷</span>
            <p>Upload a photo (optional)</p>
          </div>
        )}
      </label>
      <button
        className="btn btn-primary"
        onClick={handleSubmitClick}
        disabled={uploading || !answer}
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        {uploading ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  )
}
