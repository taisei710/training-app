import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS, EDUCATION_PROGRAMS, EDUCATION_PROGRAM_GROUPS } from '../../lib/constants'
import styles from './MemberDetail.module.css'

const GROUP_COLORS = {
  kouji: '#378ADD',
  eigyo: '#1D9E75',
  jimu:  '#EF9F27',
}

export default function MemberDetail() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('progress')
  const [attendanceRecs, setAttendanceRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [eduProgress, setEduProgress] = useState([])
  const [eduTab, setEduTab] = useState('jimu')
  const [editNo, setEditNo] = useState(null)
  const [editForm, setEditForm] = useState({ completed: false, training_date: '', trainer_name: '', hours: '' })
  const [saving, setSaving] = useState(false)

  const member = MEMBERS.find((m) => m.id === memberId)

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: eData }, { data: aData }] = await Promise.all([
        supabase.from('education_progress').select('*').eq('member_id', memberId),
        supabase.from('attendance').select('*').eq('member_id', memberId).order('clock_in', { ascending: false }),
      ])
      if (eData) setEduProgress(eData)
      if (aData) setAttendanceRecs(aData)
      setLoading(false)
    }
    fetchAll()
  }, [memberId])

  const getEduRecord = (no) => eduProgress.find((p) => String(p.program_no) === String(no))

  const activeGroup = EDUCATION_PROGRAM_GROUPS.find((g) => g.id === eduTab)
  const activePrograms = activeGroup?.programs ?? []
  const eduCompletedCount = activePrograms.filter((p) => getEduRecord(p.no)?.completed).length
  const eduPct = activePrograms.length > 0
    ? Math.round((eduCompletedCount / activePrograms.length) * 100)
    : 0

  const openEdit = (no) => {
    const rec = getEduRecord(no)
    setEditForm({
      completed:     rec?.completed     ?? false,
      training_date: rec?.training_date ?? '',
      trainer_name:  rec?.trainer_name  ?? '',
      hours:         rec?.hours != null ? String(rec.hours) : '',
    })
    setEditNo(no)
  }

  const handleEduSave = async () => {
    if (saving) return
    setSaving(true)
    const { error, data } = await supabase
      .from('education_progress')
      .upsert(
        {
          member_id:     memberId,
          program_no:    editNo,
          completed:     editForm.completed,
          training_date: editForm.training_date || null,
          trainer_name:  editForm.trainer_name  || null,
          hours:         editForm.hours !== '' ? Number(editForm.hours) : null,
        },
        { onConflict: 'member_id,program_no' }
      )
      .select()
    if (!error) {
      setEduProgress((prev) => {
        const next = prev.filter((p) => String(p.program_no) !== String(editNo))
        return data ? [...next, ...data] : next
      })
      setEditNo(null)
    } else {
      console.error('education_progress upsert error:', error)
    }
    setSaving(false)
  }

  const GOAL_HOURS = 80

  const totalHours = attendanceRecs
    .filter((r) => r.total_hours != null)
    .reduce((s, r) => s + r.total_hours, 0)

  const hoursPct = Math.min((totalHours / GOAL_HOURS) * 100, 100)

  function fmtH(h) {
    if (h == null) return '—'
    return h % 1 === 0 ? String(h) : h.toFixed(1)
  }

  function fmtClock(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function fmtDateShort(ds) {
    const d = new Date(ds + 'T00:00:00')
    const DAYS = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`
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
          時間進捗
        </button>
        <button
          className={`${styles.tab} ${tab === 'education' ? styles.tabActive : ''}`}
          onClick={() => setTab('education')}
        >
          教育プログラム
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : tab === 'progress' ? (
        <div className={styles.progressContent}>
          <div className={styles.deptCard}>
            <div className={styles.deptHeader}>
              <span className={styles.deptName}>累計勤務時間</span>
              <span className={styles.deptUnits}>
                <strong>{fmtH(totalHours)}</strong>/{GOAL_HOURS}h
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${hoursPct}%`, background: hoursPct >= 100 ? 'var(--accent)' : 'var(--primary)' }}
              />
            </div>
            <div className={styles.progressPct}>
              {hoursPct >= 100 ? '✓ 目標達成！' : `${Math.round(hoursPct)}%`}
            </div>
          </div>

          <h3 className={styles.attendanceListTitle}>打刻記録</h3>
          {attendanceRecs.length === 0 ? (
            <p className={styles.noGoal}>記録がありません</p>
          ) : (
            <div className={styles.attendanceList}>
              {attendanceRecs.map((r) => (
                <div key={r.id} className={`${styles.attendanceItem} ${!r.clock_out ? styles.attendanceItemOpen : ''}`}>
                  <span className={styles.attendanceDate}>{fmtDateShort(r.date)}</span>
                  <span className={styles.attendanceTime}>
                    {fmtClock(r.clock_in)} 〜 {fmtClock(r.clock_out)}
                  </span>
                  <span className={styles.attendanceHours}>
                    {r.total_hours != null ? `${fmtH(r.total_hours)}h` : !r.clock_out ? '出勤中' : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
                  onClick={() => { setEduTab(g.id); setEditNo(null) }}
                >
                  {g.label}
                </button>
              )
            })}
          </div>

          {activePrograms.length === 0 ? (
            <div className={styles.eduPreparing}>教育プログラムは準備中です</div>
          ) : (
            <>
              <div className={styles.eduSummary}>
                <div className={styles.eduSummaryRow}>
                  <span className={styles.eduSummaryLabel}>{activeGroup.label} 進捗</span>
                  <span className={styles.eduSummaryCount}>
                    <strong>{eduCompletedCount}</strong>/{activePrograms.length} 完了
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${eduPct}%`, background: eduPct === 100 ? 'var(--accent)' : 'var(--primary)' }}
                  />
                </div>
                <p className={styles.progressPct}>{eduPct}%</p>
              </div>

              <div className={styles.eduList}>
                {activePrograms.map((prog) => {
                  const rec = getEduRecord(prog.no)
                  const done = rec?.completed
                  return (
                    <button
                      key={prog.no}
                      className={`${styles.eduItem} ${done ? styles.eduItemDone : ''}`}
                      onClick={() => openEdit(prog.no)}
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
                            {rec.training_date || '日付未設定'}
                            {rec.trainer_name  || '担当未設定'}
                            {rec.hours != null ? `${rec.hours}h` : '時間未設定'}
                          </p>
                        )}
                      </div>
                      <span className={styles.eduArrow}>›</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {editNo && (
        <div className={styles.overlay} onClick={() => setEditNo(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalNo}>NO.{editNo}</span>
              <button className={styles.modalClose} onClick={() => setEditNo(null)}>✕</button>
            </div>
            <p className={styles.modalTitle}>{EDUCATION_PROGRAMS.find((p) => p.no === editNo)?.title}</p>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={editForm.completed}
                onChange={(e) => setEditForm({ ...editForm, completed: e.target.checked })}
              />
              <span className={styles.checkLabel}>完了済み</span>
            </label>

            <div className={styles.field}>
              <label className={styles.label}>受講日</label>
              <input
                type="date"
                className={styles.input}
                value={editForm.training_date}
                onChange={(e) => setEditForm({ ...editForm, training_date: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>担当者名</label>
              <input
                type="text"
                className={styles.input}
                value={editForm.trainer_name}
                onChange={(e) => setEditForm({ ...editForm, trainer_name: e.target.value })}
                placeholder="担当者名を入力"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>時間</label>
              <input
                type="number"
                className={styles.input}
                value={editForm.hours}
                onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                placeholder="例: 1.5"
                min="0"
                step="0.5"
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setEditNo(null)} disabled={saving}>
                キャンセル
              </button>
              <button className={styles.modalSaveBtn} onClick={handleEduSave} disabled={saving}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
