import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS } from '../../lib/constants'
import styles from './Home.module.css'

export default function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [user.id])

  const fetchReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('member_id', user.id)
    if (error) console.error('Supabase fetch error:', error)
    if (!error && data) setReports(data)
    setLoading(false)
  }

  const getUnits = (deptId) =>
    reports
      .filter((r) => r.department_id === deptId)
      .reduce((sum, r) => sum + r.units, 0)

  const totalReports = reports.length

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

      <div className={styles.summaryCard}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{totalReports}</span>
          <span className={styles.summaryLabel}>提出日報</span>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>単位進捗</h3>
        {loading ? (
          <div className={styles.loading}>読み込み中...</div>
        ) : (
          <div className={styles.deptList}>
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
                {dept.id === 'sales_office' && (
                  <button
                    className={styles.programBtn}
                    onClick={() => navigate('/trainee/sales-office-program')}
                  >
                    教育プログラムを見る →</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
