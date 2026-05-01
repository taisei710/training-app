import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import styles from './Home.module.css'

const DEPT_GOALS = [
  { id: 'kouji', label: '工事部体験',   color: '#378ADD', goal: 80 },
  { id: 'eigyo', label: '技術営業体験', color: '#1D9E75', goal: 80 },
  { id: 'jimu',  label: '営業事務体験', color: '#EF9F27', goal: 80 },
]

function calcHours(start, end, breakMin = 0) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm - breakMin) / 60)
}

function fmtH(h) {
  if (!h) return '0'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export default function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const [deptHours, setDeptHours] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const year = new Date().getFullYear()
    const { data: shifts } = await supabase
      .from('shifts')
      .select('department_id, start_time, end_time, break_minutes')
      .eq('member_id', user.id)
      .gte('date', `${year}-04-21`)
      .lte('date', `${year}-10-20`)

    const hours = {}
    if (shifts) {
      shifts.forEach(s => {
        const h = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
        hours[s.department_id] = (hours[s.department_id] ?? 0) + h
      })
    }
    setDeptHours(hours)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>こんにちは</p>
          <h2 className={styles.userName}>{user.name} さん</h2>
        </div>
        <button className={styles.logoutBtn} onClick={onLogout}>
          ログアウト
        </button>
      </header>

      <div className={styles.actionCards}>
        <button className={styles.actionCard} onClick={() => navigate('/trainee/schedule')}>
          <span className={styles.actionCardIcon}>🗓️</span>
          <span className={styles.actionCardLabel}>スケジュール</span>
        </button>
        <button className={styles.actionCard} onClick={() => navigate('/trainee/attendance')}>
          <span className={styles.actionCardIcon}>⏱️</span>
          <span className={styles.actionCardLabel}>打刻する</span>
        </button>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>研修進捗</p>
        {loading ? (
          <div className={styles.loading}>読み込み中…</div>
        ) : (
          <div className={styles.deptList}>
            {DEPT_GOALS.map(dept => {
              const h   = deptHours[dept.id] ?? 0
              const pct = Math.min((h / dept.goal) * 100, 100)
              return (
                <button
                  key={dept.id}
                  className={styles.deptCard}
                  onClick={() => navigate(`/trainee/program?dept=${dept.id}`)}
                >
                  <div className={styles.deptHeader}>
                    <span className={styles.deptName} style={{ color: dept.color }}>{dept.label}</span>
                    <span className={styles.deptUnits}>{fmtH(h)} / {dept.goal}h</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${pct}%`, background: pct >= 100 ? '#10B981' : dept.color }}
                    />
                  </div>
                  <p className={styles.progressPct}>
                    {pct >= 100 ? '✓ 達成！' : `${Math.round(pct)}%`}
                  </p>
                  <span className={styles.deptChevron}>›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
