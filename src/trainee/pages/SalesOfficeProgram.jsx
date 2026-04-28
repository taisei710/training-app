import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { EDUCATION_PROGRAMS } from '../../lib/constants'
import styles from './SalesOfficeProgram.module.css'

const TOTAL = EDUCATION_PROGRAMS.length

export default function SalesOfficeProgram({ user }) {
  const navigate = useNavigate()
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProgress() }, [user.id])

  const fetchProgress = async () => {
    const { data } = await supabase
      .from('education_progress')
      .select('*')
      .eq('member_id', user.id)
    if (data) setProgress(data)
    setLoading(false)
  }

  const getRecord = (no) => progress.find((p) => p.program_no === no)

  const completedCount = EDUCATION_PROGRAMS.filter((p) => getRecord(p.no)?.completed).length
  const pct = Math.round((completedCount / TOTAL) * 100)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/trainee')}>
          ‹ 戻る
        </button>
        <h2 className={styles.title}>教育プログラム</h2>
        <div />
      </header>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>営業事務体験 教育プログラム</span>
          <span className={styles.summaryCount}>
            <strong>{completedCount}</strong>/{TOTAL} 完了
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${pct}%`, background: pct === 100 ? 'var(--accent)' : 'var(--primary)' }}
          />
        </div>
        <p className={styles.progressPct}>{pct}%</p>
      </div>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : (
        <div className={styles.list}>
          {EDUCATION_PROGRAMS.map((prog) => {
            const rec = getRecord(prog.no)
            const done = rec?.completed
            return (
              <div
                key={prog.no}
                className={`${styles.item} ${done ? styles.itemDone : ''}`}
              >
                <div className={styles.itemBadge}>
                  {done
                    ? <span className={styles.checkIcon}>✓</span>
                    : <span className={styles.noNum}>{prog.no}</span>
                  }
                </div>
                <div className={styles.itemBody}>
                  <p className={styles.itemNo}>NO.{prog.no}</p>
                  <p className={styles.itemTitle}>{prog.title}</p>
                  <p className={styles.itemMission}>ミッション: {prog.mission}</p>
                  {done && rec.training_date && (
                    <p className={styles.itemMeta}>
                      {rec.training_date}　{rec.trainer_name || '—'}　{rec.hours != null ? `${rec.hours}h` : '—'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
