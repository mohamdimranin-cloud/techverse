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
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [responses, setResponses] = useState([])
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const loadLeaderboard = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'
      const res = await fetch(`${apiUrl}/api/hint-leaderboard`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      setLeaderboard(data)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    }
  }

  useEffect(() => {
    loadStats()
    loadLeaderboard()
    const interval = setInterval(() => {
      loadStats()
      loadLeaderboard()
    }, 15000) // Refresh every 15s
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

  // Filter leaderboard based on search
  const filteredLeaderboard = leaderboard.filter(entry => {
    const query = searchQuery.toLowerCase()
    return (
      entry.name.toLowerCase().includes(query) ||
      entry.team_name.toLowerCase().includes(query) ||
      entry.ticket_id.toLowerCase().includes(query)
    )
  })

  // Get top 20 completed members
  const top20Completed = leaderboard.filter(entry => entry.is_complete).slice(0, 20)

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
          <div className={styles.statCard}>
            <div className={styles.statValue}>{leaderboard.length}</div>
            <div className={styles.statLabel}>Leaderboard Entries</div>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          style={{ marginTop: '1rem' }}
        >
          {showLeaderboard ? '📊 Show All Teams' : '🏆 Show Leaderboard (Top 20)'}
        </button>
      </div>

      {showLeaderboard ? (
        <div className={styles.leaderboard}>
          <div className={styles.leaderboardHeader}>
            <h3 className={styles.leaderboardTitle}>🏆 Hint Game Leaderboard - All Members</h3>
            <input
              type="text"
              placeholder="🔍 Search by name, team, or ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Top 20 Completed Section */}
          {top20Completed.length > 0 && (
            <div className={styles.top20Section}>
              <h4 className={styles.sectionTitle}>🌟 Top 20 - First to Complete All 10 Hints</h4>
              <div className={styles.leaderboardTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Team</th>
                      <th>Ticket ID</th>
                      <th>Completed</th>
                      <th>Completion Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top20Completed.map((entry) => (
                      <tr key={entry.rank} className={entry.rank <= 3 ? styles.topThree : ''}>
                        <td className={styles.rank}>
                          {entry.rank === 1 && '🥇'}
                          {entry.rank === 2 && '🥈'}
                          {entry.rank === 3 && '🥉'}
                          {entry.rank > 3 && `#${entry.rank}`}
                        </td>
                        <td className={styles.name}>
                          <button 
                            className={styles.nameLink}
                            onClick={() => viewMemberResponses(entry.name)}
                          >
                            {entry.name}
                          </button>
                        </td>
                        <td>{entry.team_name}</td>
                        <td className={styles.ticketId}>{entry.ticket_id}</td>
                        <td className={styles.completed}>
                          <span className={styles.completeBadge}>✅ {entry.completed_count}/10</span>
                        </td>
                        <td className={styles.time}>
                          {new Date(entry.completion_time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Members Section */}
          <div className={styles.allMembersSection}>
            <h4 className={styles.sectionTitle}>
              📋 All Members ({filteredLeaderboard.length} total)
            </h4>
            {filteredLeaderboard.length === 0 ? (
              <div className={styles.empty}>
                {searchQuery ? 'No members match your search.' : 'No members found.'}
              </div>
            ) : (
              <div className={styles.leaderboardTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Team</th>
                      <th>Ticket ID</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.map((entry) => (
                      <tr 
                        key={entry.rank} 
                        className={entry.is_complete ? styles.completedRow : ''}
                      >
                        <td className={styles.rankNum}>#{entry.rank}</td>
                        <td className={styles.name}>
                          <button 
                            className={styles.nameLink}
                            onClick={() => viewMemberResponses(entry.name)}
                            disabled={entry.completed_count === 0}
                          >
                            {entry.name}
                          </button>
                        </td>
                        <td>{entry.team_name}</td>
                        <td className={styles.ticketId}>{entry.ticket_id}</td>
                        <td>
                          <div className={styles.progressCell}>
                            <div className={styles.progressBar} style={{
                              width: `${(entry.completed_count / 10) * 100}%`,
                              backgroundColor: entry.is_complete ? '#10b981' : '#f59e0b'
                            }} />
                            <span className={styles.progressText}>
                              {entry.completed_count}/10
                            </span>
                          </div>
                        </td>
                        <td>
                          {entry.is_complete ? (
                            <span className={styles.completeBadge}>✅ Complete</span>
                          ) : entry.completed_count > 0 ? (
                            <span className={styles.inProgressBadge}>⏳ In Progress</span>
                          ) : (
                            <span className={styles.notStartedBadge}>⚪ Not Started</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.teams}>
          {stats.map(team => {
            const allComplete = team.members.every(m => m.is_complete)
            const someComplete = team.members.some(m => m.is_complete)
            
            return (
              <div key={team.registration_id} className={`${styles.teamCard} ${allComplete ? styles.complete : someComplete ? styles.partial : ''}`}>
                <div className={styles.teamHeader}>
                  <div>
                    <h3>{team.team_name}</h3>
                    <span className={styles.statusBadge} style={{
                      backgroundColor: team.status === 'payment successful' ? 'rgba(34, 211, 238, 0.2)' : 
                                       team.status === 'payment pending' ? 'rgba(251, 146, 60, 0.2)' : 
                                       'rgba(16, 185, 129, 0.2)',
                      color: team.status === 'payment successful' ? '#22d3ee' : 
                             team.status === 'payment pending' ? '#fb923c' : 
                             '#10b981'
                    }}>
                      {team.status}
                    </span>
                  </div>
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
      )}

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
