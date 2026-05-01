import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { EDUCATION_PROGRAM_GROUPS } from '../../lib/constants'
import styles from './Program.module.css'

export default function Program({ user }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [eduTab, setEduTab] = useState(() => searchParams.get('dept') ?? 'jimu')
  const [eduProgress, setEduProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('education_progress')
      .select('*')
      .eq('member_id', user.id)
      .then(({ data }) => {
        if (data) setEduProgress(data)
        setLoading(false)
      })
  }, [user.id])

  const getEduRecord = (no) =>
    eduProgress.find((p) => String(p.program_no) === String(no))

  const activeGroup    = EDUCATION_PROGRAM_GROUPS.find((g) => g.id === eduTab)
  const activePrograms = activeGroup?.programs ?? []
  const completedCount = activePrograms.filter((p) => getEduRecord(p.no)?.completed).length
  const pct = activePrograms.length > 0
    ? Math.round((completedCount / activePrograms.length) * 100)
    : 0

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/trainee')}>
          ‹ 戻る
        </button>
        <h2 className={styles.title}>教育プログラム</h2>
        <div />
      </header>

      <div className={styles.eduContent}>
        <div className={styles.eduSegment}>
          {EDUCATION_PROGRAM_GROUPS.map((g) => (
            <button
              key={g.id}
              className={`${styles.eduSegBtn} ${eduTab === g.id ? styles.eduSegBtnActive : ''}`}
              onClick={() => setEduTab(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loading}>読み込み中…</div>
        ) : activePrograms.length === 0 ? (
          <div className={styles.eduPreparing}>
            <p className={styles.eduPreparingIcon}>🚧</p>
            <p>このプログラムは準備中です</p>
          </div>
        ) : (
          <>
            <div className={styles.eduSummary}>
              <div className={styles.eduSummaryRow}>
                <span className={styles.eduSummaryLabel}>{activeGroup.label} 進捗</span>
                <span className={styles.eduSummaryCount}>
                  <strong>{completedCount}</strong>/{activePrograms.length} 完了
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

            <div className={styles.eduList}>
              {activePrograms.map((prog) => {
                const rec  = getEduRecord(prog.no)
                const done = rec?.completed
                return (
                  <div
                    key={prog.no}
                    className={`${styles.eduItem} ${done ? styles.eduItemDone : ''}`}
                  >
                    <div className={styles.eduBadge}>
                      {done
                        ? <span className={styles.eduCheck}>✓</span>
                        : <span className={styles.eduNo}>{prog.no}</span>
                      }
                    </div>
                    <div className={styles.eduBody}>
                      <p className={styles.eduNoLabel}>NO.{prog.no}</p>
                      <p className={styles.eduTitle}>{prog.title}</p>
                      {done && (
                        <p className={styles.eduMeta}>
                          {rec.training_date && <span>{rec.training_date}</span>}
                          {rec.trainer_name  && <span>{rec.trainer_name}</span>}
                          {rec.hours != null  && <span>{rec.hours}h</span>}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
