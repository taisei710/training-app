import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS, EDUCATION_PROGRAM_GROUPS } from '../../lib/constants'
import styles from './MemberDetail.module.css'

const GROUP_COLORS = {
  kouji: '#378ADD',
  eigyo: '#1D9E75',
  jimu:  '#EF9F27',
}

export default function MemberDetail() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [eduProgress, setEduProgress] = useState([])
  const [eduTab, setEduTab] = useState('jimu')
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ completed: false, training_date: '', trainer_name: '', hours: '' })
  const [saving, setSaving] = useState(false)

  const member = MEMBERS.find((m) => m.id === memberId)

  useEffect(() => {
    const fetchAll = async () => {
      const { data: eData } = await supabase
        .from('education_progress').select('*').eq('member_id', memberId)
      if (eData) setEduProgress(eData)
      setLoading(false)
    }
    fetchAll()
  }, [memberId])

  const getEduRecord = (id) => eduProgress.find((p) => String(p.program_no) === String(id))

  const activeGroup    = EDUCATION_PROGRAM_GROUPS.find((g) => g.id === eduTab)
  const activePrograms = activeGroup?.programs ?? []
  const isPdf             = eduTab === 'eigyo'
  const eduCompletedCount = isPdf ? 0 : activePrograms.filter((p) => getEduRecord(p.id)?.completed).length
  const eduPct = (!isPdf && activePrograms.length > 0)
    ? Math.round((eduCompletedCount / activePrograms.length) * 100)
    : 0

  const editProg = editId !== null
    ? activeGroup?.programs.find((p) => String(p.id) === String(editId))
    : null

  const openEdit = (id) => {
    const rec = getEduRecord(id)
    setEditForm({
      completed:     rec?.completed     ?? false,
      training_date: rec?.training_date ?? '',
      trainer_name:  rec?.trainer_name  ?? '',
      hours:         rec?.hours != null ? String(rec.hours) : '',
    })
    setEditId(id)
  }

  const handleEduSave = async () => {
    if (saving) return
    setSaving(true)
    const { error, data } = await supabase
      .from('education_progress')
      .upsert(
        {
          member_id:     memberId,
          program_no:    editId,
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
        const next = prev.filter((p) => String(p.program_no) !== String(editId))
        return data ? [...next, ...data] : next
      })
      setEditId(null)
    } else {
      console.error('education_progress upsert error:', error)
    }
    setSaving(false)
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

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
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
                  onClick={() => { setEduTab(g.id); setEditId(null) }}
                >
                  {g.label}
                </button>
              )
            })}
          </div>

          {isPdf ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <a
                  href="https://fqdxnongrngfagtayfib.supabase.co/storage/v1/object/public/documents/2027gizyutupro.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PDFを開く
                </a>
              </div>
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <iframe
                  src="https://fqdxnongrngfagtayfib.supabase.co/storage/v1/object/public/documents/2027gizyutupro.pdf"
                  title="技術営業体験プログラム"
                  style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
                />
              </div>
            </div>
          ) : activePrograms.length === 0 ? (
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
                  const rec   = getEduRecord(prog.id)
                  const done  = rec?.completed
                  const hasNo = prog.no !== ''
                  return (
                    <button
                      key={prog.id}
                      className={`${styles.eduItem} ${done ? styles.eduItemDone : ''}`}
                      onClick={() => openEdit(prog.id)}
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

      {editId !== null && (
        <div className={styles.overlay} onClick={() => setEditId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              {editProg?.no && (
                <span className={styles.modalNo}>NO.{editProg.no}</span>
              )}
              <button className={styles.modalClose} onClick={() => setEditId(null)}>✕</button>
            </div>
            <p className={styles.modalTitle}>{editProg?.title}</p>

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
              <button className={styles.modalCancelBtn} onClick={() => setEditId(null)} disabled={saving}>
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
