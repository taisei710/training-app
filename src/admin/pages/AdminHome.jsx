import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS, DEPARTMENTS } from '../../lib/constants'
import styles from './AdminHome.module.css'

const TOTAL_GOAL = DEPARTMENTS.reduce((s, d) => s + (d.goal || 0), 0)

export default function AdminHome() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (data) setReports(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const todayCount = reports.filter(
    (r) => r.submitted_at?.slice(0, 10) === today
  ).length

  const getMemberUnits = (memberId) =>
    reports
      .filter((r) => r.member_id === memberId)
      .reduce((sum, r) => sum + r.units, 0)

  const getDeptUnits = (memberId, deptId) =>
    reports
      .filter((r) => r.member_id === memberId && r.department_id === deptId)
      .reduce((sum, r) => sum + r.units, 0)

  const totalAchieved = MEMBERS.reduce(
    (sum, m) => sum + Math.min(getMemberUnits(m.id), TOTAL_GOAL),
    0
  )
  const overallPct =
    TOTAL_GOAL > 0
      ? Math.round((totalAchieved / (MEMBERS.length * TOTAL_GOAL)) * 100)
      : 0

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>管理ダッシュボード</h1>
        <p className={styles.subtitle}>2026年度 上期研修</p>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{overallPct}%</span>
          <span className={styles.statLabel}>全体達成率</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{todayCount}</span>
          <span className={styles.statLabel}>本日提出件数</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>メンバー別進捗</h2>
        {loading ? (
          <div className={styles.loading}>読み込み中...</div>
        ) : (
          <div className={styles.memberList}>
            {MEMBERS.map((member) => {
              const total = getMemberUnits(member.id)
              const pct = TOTAL_GOAL > 0 ? Math.min((total / TOTAL_GOAL) * 100, 100) : 0
              const reportCount = reports.filter((r) => r.member_id === member.id).length
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
                      <span className={styles.memberUnits}>{total} 単位</span>
                      <span className={styles.memberReports}>{reportCount}件</span>
                    </div>
                  </div>
                  <div className={styles.deptBars}>
                    {DEPARTMENTS.filter((d) => d.goal).map((d) => {
                      const u = getDeptUnits(member.id, d.id)
                      const dp = Math.min((u / d.goal) * 100, 100)
                      return (
                        <div key={d.id} className={styles.deptBar}>
                          <span className={styles.deptBarLabel}>{d.name.replace('体験', '')}</span>
                          <div className={styles.deptBarTrack}>
                            <div
                              className={styles.deptBarFill}
                              style={{ width: `${dp}%`, background: dp >= 100 ? 'var(--accent)' : 'var(--primary)' }}
                            />
                          </div>
                          <span className={styles.deptBarVal}>{u}/{d.goal}</span>
                        </div>
                      )
                    })}
                  </div>
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
