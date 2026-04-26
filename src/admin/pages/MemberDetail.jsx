import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS, DEPARTMENTS } from '../../lib/constants'
import styles from './MemberDetail.module.css'

const DEPT_MAP = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

export default function MemberDetail() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('progress')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const member = MEMBERS.find((m) => m.id === memberId)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('member_id', memberId)
        .order('submitted_at', { ascending: false })
      if (data) setReports(data)
      setLoading(false)
    }
    fetch()
  }, [memberId])

  const getUnits = (deptId) =>
    reports.filter((r) => r.department_id === deptId).reduce((s, r) => s + r.units, 0)

  const formatDate = (iso) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  if (!member) return null

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin')}>
          ‹ 戻る
        </button>
        <div>
          <h2 className={styles.name}>{member.name}</h2>
          <p className={styles.kana}>{member.kana}</p>
        </div>
        <div />
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'progress' ? styles.tabActive : ''}`}
          onClick={() => setTab('progress')}
        >
          単位進捗
        </button>
        <button
          className={`${styles.tab} ${tab === 'reports' ? styles.tabActive : ''}`}
          onClick={() => setTab('reports')}
        >
          日報一覧
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : tab === 'progress' ? (
        <div className={styles.progressContent}>
          {DEPARTMENTS.map((dept) => {
            const units = getUnits(dept.id)
            const goal = dept.goal
            const pct = goal ? Math.min((units / goal) * 100, 100) : null
            return (
              <div key={dept.id} className={styles.deptCard}>
                <div className={styles.deptHeader}>
                  <span className={styles.deptName}>{dept.name}</span>
                  <span className={styles.deptUnits}>
                    {units}{goal ? `/${goal}` : ''} 単位
                  </span>
                </div>
                {goal ? (
                  <>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressBar}
                        style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? 'var(--accent)' : 'var(--primary)',
                        }}
                      />
                    </div>
                    <div className={styles.progressPct}>
                      {pct >= 100 ? '✓ 目標達成！' : `${Math.round(pct)}%`}
                    </div>
                  </>
                ) : (
                  <p className={styles.noGoal}>目標なし（記録のみ）</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.reportContent}>
          {reports.length === 0 ? (
            <div className={styles.empty}>日報がありません</div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className={styles.reportCard}>
                <div className={styles.reportHeader}>
                  <span className={styles.deptTag}>{DEPT_MAP[r.department_id] || r.department_id}</span>
                  <span className={styles.units}>+{r.units}単位</span>
                </div>
                <p className={styles.reportContent2}>{r.content}</p>
                <p className={styles.reportDate}>{formatDate(r.submitted_at)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
