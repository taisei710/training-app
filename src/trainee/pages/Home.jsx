import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import styles from './Home.module.css'

const GOAL_HOURS = 80

function fmtH(h) {
  if (h == null) return '0'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export default function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('total_hours')
      .eq('member_id', user.id)
      .not('total_hours', 'is', null)
    if (data) setTotalHours(data.reduce((s, r) => s + (r.total_hours || 0), 0))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const pct = Math.min((totalHours / GOAL_HOURS) * 100, 100)

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

      <div className={styles.hoursCard}>
        <div className={styles.hoursHeader}>
          <span className={styles.hoursLabel}>累計勤務時間</span>
          <span className={styles.hoursValue}>
            <strong>{loading ? '…' : fmtH(totalHours)}</strong>
            <span className={styles.hoursGoal}>/{GOAL_HOURS}h</span>
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--primary)' }}
          />
        </div>
        <p className={styles.progressPct}>
          {pct >= 100 ? '✓ 目標達成！' : `${Math.round(pct)}%`}
        </p>
      </div>

      <div className={styles.quickActions}>
        <button className={styles.actionBtn} onClick={() => navigate('/trainee/attendance')}>
          <span className={styles.actionIcon}>⏱️</span>
          <span className={styles.actionLabel}>打刻する</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/trainee/schedule')}>
          <span className={styles.actionIcon}>🗓️</span>
          <span className={styles.actionLabel}>スケジュール</span>
        </button>
        <button className={styles.actionBtn} onClick={() => navigate('/trainee/sales-office-program')}>
          <span className={styles.actionIcon}>📋</span>
          <span className={styles.actionLabel}>教育プログラム</span>
        </button>
      </div>
    </div>
  )
}
