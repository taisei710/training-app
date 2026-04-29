import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS } from '../../lib/constants'
import styles from './AdminHome.module.css'

const GOAL_HOURS = 80

function fmtH(h) {
  if (h == null) return '0'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export default function AdminHome() {
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState([])
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: allData }, { data: todayData }] = await Promise.all([
        supabase
          .from('attendance')
          .select('member_id, total_hours')
          .not('total_hours', 'is', null),
        supabase
          .from('attendance')
          .select('member_id')
          .eq('date', today),
      ])
      if (allData) setAttendance(allData)
      if (todayData) setTodayCount(todayData.length)
      setLoading(false)
    }
    fetchAll()
  }, [today])

  const getMemberHours = (memberId) =>
    attendance
      .filter((r) => r.member_id === memberId)
      .reduce((s, r) => s + (r.total_hours || 0), 0)

  const totalAchieved = MEMBERS.reduce(
    (sum, m) => sum + Math.min(getMemberHours(m.id), GOAL_HOURS),
    0
  )
  const overallPct = Math.round((totalAchieved / (MEMBERS.length * GOAL_HOURS)) * 100)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>管理ダッシュボード</h1>
        <p className={styles.subtitle}>2026年度 上期研修</p>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{overallPct}%</span>
          <span className={styles.statLabel}>勤務時間達成率</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{todayCount}</span>
          <span className={styles.statLabel}>本日出勤数</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>メンバー別進捗</h2>
        {loading ? (
          <div className={styles.loading}>読み込み中...</div>
        ) : (
          <div className={styles.memberList}>
            {MEMBERS.map((member) => {
              const hours = getMemberHours(member.id)
              const pct   = Math.min((hours / GOAL_HOURS) * 100, 100)
              return (
                <button
                  key={member.id}
                  className={styles.memberCard}
                  onClick={() => navigate(`/admin/member/${member.id}`)}
                >
                  <div className={styles.memberTop}>
                    <div>
                      <p className={styles.memberName}>{member.name}</p>
                      <p className={styles.memberKana}>{member.kana}</p>
                    </div>
                    <div className={styles.memberMeta}>
                      <span className={styles.memberHours}>
                        <strong>{fmtH(hours)}</strong>
                        <span className={styles.memberGoal}>/{GOAL_HOURS}h</span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--primary)' }}
                    />
                  </div>
                  <p className={styles.memberPct}>
                    {pct >= 100 ? '✓ 目標達成！' : `${Math.round(pct)}%`}
                  </p>
                  <span className={styles.chevron}>›</span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
