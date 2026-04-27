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
  const [selectedNo, setSelectedNo] = useState(null)
  const [form, setForm] = useState({ completed: false, training_date: '', trainer_name: '', hours: '' })
  const [saving, setSaving] = useState(false)

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

  const openModal = (no) => {
    const rec = getRecord(no)
    setForm({
      completed:     rec?.completed     ?? false,
      training_date: rec?.training_date ?? '',
      trainer_name:  rec?.trainer_name  ?? '',
      hours:         rec?.hours != null ? String(rec.hours) : '',
    })
    setSelectedNo(no)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const { error } = await supabase
      .from('education_progress')
      .upsert(
        {
          member_id:     user.id,
          program_no:    selectedNo,
          completed:     form.completed,
          training_date: form.training_date || null,
          trainer_name:  form.trainer_name  || null,
          hours:         form.hours !== '' ? Number(form.hours) : null,
        },
        { onConflict: 'member_id,program_no' }
      )
    if (!error) {
      await fetchProgress()
      setSelectedNo(null)
    } else {
      console.error('education_progress upsert error:', error)
    }
    setSaving(false)
  }

  const selectedProg = EDUCATION_PROGRAMS.find((p) => p.no === selectedNo)

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
              <button
                key={prog.no}
                className={`${styles.item} ${done ? styles.itemDone : ''}`}
                onClick={() => openModal(prog.no)}
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
                <span className={styles.arrow}>›</span>
              </button>
            )
          })}
        </div>
      )}

      {selectedNo && (
        <div className={styles.overlay} onClick={() => setSelectedNo(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalNo}>NO.{selectedNo}</span>
              <button className={styles.modalClose} onClick={() => setSelectedNo(null)}>✕</button>
            </div>
            <p className={styles.modalTitle}>{selectedProg?.title}</p>
            <p className={styles.modalMission}>ミッション: {selectedProg?.mission}</p>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
              />
              <span className={styles.checkLabel}>完了済みにする</span>
            </label>

            <div className={styles.field}>
              <label className={styles.label}>受講日</label>
              <input
                type="date"
                className={styles.input}
                value={form.training_date}
                onChange={(e) => setForm({ ...form, training_date: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>担当者名</label>
              <input
                type="text"
                className={styles.input}
                value={form.trainer_name}
                onChange={(e) => setForm({ ...form, trainer_name: e.target.value })}
                placeholder="担当者名を入力"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>時間</label>
              <input
                type="number"
                className={styles.input}
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="例: 1.5"
                min="0"
                step="0.5"
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setSelectedNo(null)}
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                className={styles.modalSaveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
