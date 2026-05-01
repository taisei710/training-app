import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { EDUCATION_PROGRAM_GROUPS, EIGYO_PDF_URL } from '../../lib/constants'
import styles from './Program.module.css'

const GROUP_COLORS = {
  kouji: '#378ADD',
  eigyo: '#1D9E75',
  jimu:  '#EF9F27',
}

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

  const getEduRecord = (id) =>
    eduProgress.find((p) => String(p.program_no) === String(id))

  const activeGroup    = EDUCATION_PROGRAM_GROUPS.find((g) => g.id === eduTab)
  const activePrograms = activeGroup?.programs ?? []
  const isPdf          = eduTab === 'eigyo'
  const completedCount = isPdf ? 0 : activePrograms.filter((p) => getEduRecord(p.id)?.completed).length
  const pct = (!isPdf && activePrograms.length > 0)
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
          {EDUCATION_PROGRAM_GROUPS.map((g) => {
            const color = GROUP_COLORS[g.id] ?? 'var(--primary)'
            const isActive = eduTab === g.id
            return (
              <button
                key={g.id}
                className={styles.eduSegBtn}
                style={isActive
                  ? { background: color, color: 'white', borderColor: color }
                  : { background: 'white', color: color, borderColor: color }
                }
                onClick={() => setEduTab(g.id)}
              >
                {g.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className={styles.loading}>読み込み中…</div>
        ) : isPdf ? (
          <div className={styles.eigyoPdf}>
            <iframe
              src={EIGYO_PDF_URL}
              width="100%"
              style={{ height: '600px', border: 'none', display: 'block' }}
              title="技術営業体験研修プログラム"
            />
            <a
              href={EIGYO_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.eigyoPdfLink}
            >
              PDFを開く
            </a>
          </div>
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
                const rec    = getEduRecord(prog.id)
                const done   = rec?.completed
                const hasNo  = prog.no !== ''
                return (
                  <div
                    key={prog.id}
                    className={`${styles.eduItem} ${done ? styles.eduItemDone : ''}`}
                  >
                    <div className={styles.eduBadge}>
                      {done
                        ? <span className={styles.eduCheck}>✓</span>
                        : hasNo ? <span className={styles.eduNo}>{prog.no}</span> : null
                      }
                    </div>
                    <div className={styles.eduBody}>
                      {hasNo && <p className={styles.eduNoLabel}>NO.{prog.no}</p>}
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
