import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS } from '../../lib/constants'
import styles from './ReportHistory.module.css'

const DEPT_MAP = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

export default function ReportHistory({ user }) {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('member_id', user.id)
        .order('submitted_at', { ascending: false })
      if (data) setReports(data)
      setLoading(false)
    }
    fetch()
  }, [user.id])

  const formatDate = (iso) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/trainee')}>
          ‹ 戻る
        </button>
        <h2 className={styles.title}>日報履歴</h2>
        <div />
      </header>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : reports.length === 0 ? (
        <div className={styles.empty}>
          <p>まだ日報がありません</p>
        </div>
      ) : (
        <div className={styles.list}>
          {reports.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.deptTag}>{DEPT_MAP[r.department_id] || r.department_id}</span>
                <span className={styles.units}>+{r.units}単位</span>
              </div>
              <p className={styles.cardContent}>{r.content}</p>
              <p className={styles.cardDate}>{formatDate(r.submitted_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
