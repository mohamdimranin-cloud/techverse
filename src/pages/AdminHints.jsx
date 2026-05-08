import { useState, useEffect } from 'react'
import styles from './AdminHints.module.css'

const QUESTION_LABELS = {
  hometown: 'Home town',
  food: 'Favourite food',
  ipl: 'Favourite IPL team',
  language: 'Mother tongue',
  beverage: 'Chai ya coffee?',
  series: 'Favourite series',
  actor: 'Favourite actor',
  genre: 'Genre in movies',
  letter: 'Name starting from same letter',
  vacation: 'Beach or mountain?',
}

export default function AdminHints({ getToken }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [responses, setResponses] = useState([])
  const [viewingPhoto, setViewingPhoto] = useState(null)

  console.log('AdminHints component mounted')

  const loadStats = async () => {
    console.log('Loading hint stats...')
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'
      console.log('Fetching from:', `${apiUrl}/api/hint-stats`)
      const res = await fetch(`${apiUrl}/api/hint-stats`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      console.log('Response status:', res.status)
      const data = await res.json()
      console.log('Stats data:', data)
      setStats(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load hint stats:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 15000) // Refresh every 15s
    return () => clearInterval(interval)
  }, [])

  const viewMemberResponses = async (memberName) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/hint-responses-detail/${encodeURIComponent(memberName)}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      setResponses(data)
      setSelectedMember(memberName)
    } catch (err) {
      console.error('Failed to load responses:', err)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading hint completion stats...</div>
  }

  const totalMembers = stats.reduce((sum, team) => sum + team.members.length, 0)
  const completedMembers = stats.reduce((sum, team) => 
    sum + team.members.filter(m => m.is_complete).length, 0
  )
  const fullyCompletedTeams = stats.filter(team => 
    team.members.every(m => m.is_complete)
  ).length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🎯 Hint Game Completion Tracker</h2>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{completedMembers}/{totalMembers}</div>
            <div className={styles.statLabel}>Members Completed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{fullyCompletedTeams}/{stats.length}</div>
            <div className={styles.statLabel}>Teams Fully Completed</div>
          </div>
        </div>
      </div>

      <div className={styles.teams}>
        {stats.map(team => {
          const allComplete = team.members.every(m => m.is_complete)
          const someComplete = team.members.some(m => m.is_complete)
          
          return (
            <div key={team.registration_id} className={`${styles.teamCard} ${allComplete ? styles.complete : someComplete ? styles.partial : ''}`}>
              <div className={styles.teamHeader}>
                <h3>{team.team_name}</h3>
                {allComplete && <span className={styles.badge}>✅ All Complete</span>}
              </div>
              
              <div className={styles.members}>
                {team.members.map(member => (
                  <div key={member.id} className={styles.memberRow}>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{member.name}</span>
                      <div className={styles.progress}>
                        <div 
                          className={styles.progressBar} 
                          style={{ 
                            width: `${(member.completed_count / 10) * 100}%`,
                            backgroundColor: member.is_complete ? '#10b981' : '#f59e0b'
                          }}
                        />
                      </div>
                      <span className={styles.count}>
                        {member.completed_count}/10 questions
                      </span>
                    </div>
                    {member.completed_count > 0 && (
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => viewMemberResponses(member.name)}
                      >
                        View Responses
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Response Detail Modal */}
      {selectedMember && (
        <div className={styles.modal} onClick={() => setSelectedMember(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Responses by {selectedMember}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedMember(null)}>✕</button>
            </div>
            <div className={styles.responses}>
              {responses.map((resp, idx) => (
                <div key={idx} className={styles.responseCard}>
                  <h4>{QUESTION_LABELS[resp.question_id] || resp.question_id}</h4>
                  <p><strong>Match:</strong> {resp.answer}</p>
                  {resp.description && <p><strong>Description:</strong> {resp.description}</p>}
                  <img 
                    src={resp.photo_url} 
                    alt="Match selfie" 
                    className={styles.thumbnail}
                    onClick={() => setViewingPhoto(resp.photo_url)}
                  />
                  <p className={styles.timestamp}>
                    {new Date(resp.submitted_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className={styles.photoModal} onClick={() => setViewingPhoto(null)}>
          <img src={viewingPhoto} alt="Full size" className={styles.fullPhoto} />
          <button className={styles.closePhotoBtn} onClick={() => setViewingPhoto(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
