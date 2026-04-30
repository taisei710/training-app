import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS } from '../../lib/constants'
import styles from './Instructions.module.css'

function fmtDateLabel(ds) {
  if (!ds) return '—'
  const d = new Date(ds + 'T00:00:00')
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`
}

function fmtFullDate(ds) {
  if (!ds) return '—'
  const d = new Date(ds + 'T00:00:00')
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${DAYS[d.getDay()]})`
}

export default function Instructions({ user }) {
  const [instructions, setInstructions] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportForm, setReportForm] = useState({ learned: '', impression: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const [{ data: iData }, { data: rData }] = await Promise.all([
      supabase.from('training_instructions').select('*').eq('member_id', user.id).order('date', { ascending: false }),
      supabase.from('training_reports').select('*').eq('member_id', user.id),
    ])
    if (iData) setInstructions(iData)
    if (rData) setReports(rData)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const getReport = (instructionId) => reports.find(r => r.instruction_id === instructionId)
  const getDeptName = (id) => DEPARTMENTS.find(d => d.id === id)?.name ?? id

  const openDetail = (inst) => {
    setSelected(inst)
    setShowReportForm(false)
    setReportForm({ learned: '', impression: '' })
  }

  const submitReport = async () => {
    if (submitting || !reportForm.learned.trim()) return
    setSubmitting(true)
    await supabase.from('training_reports').insert({
      instruction_id: selected.id,
      member_id:      user.id,
      learned:        reportForm.learned.trim(),
      impression:     reportForm.impression.trim() || null,
    })
    await load()
    setShowReportForm(false)
    setSubmitting(false)
  }

  const DETAIL_FIELDS = selected ? [
    ['担当者',   selected.instructor],
    ['研修場所', selected.location],
    ['最寄り駅', selected.nearest_station],
    ['開始時刻', selected.start_time],
    ['終了時刻', selected.end_time],
    ['服装',     selected.dress_code],
    ['持ち物',   selected.items_to_bring],
    ['備考',     selected.notes],
  ] : []

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>研修指示書</h2>
      </header>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : instructions.length === 0 ? (
        <p className={styles.noRecords}>指示書がありません</p>
      ) : (
        <div className={styles.list}>
          {instructions.map(inst => {
            const rep = getReport(inst.id)
            return (
              <button key={inst.id} className={styles.item} onClick={() => openDetail(inst)}>
                <div className={styles.itemLeft}>
                  <p className={styles.itemDate}>{fmtDateLabel(inst.date)}</p>
                  <p className={styles.itemDept}>{getDeptName(inst.department_id)}</p>
                </div>
                <div className={styles.itemRight}>
                  {inst.instructor && <p className={styles.itemInstructor}>{inst.instructor}</p>}
                  <span className={rep ? styles.badgeSubmitted : styles.badgePending}>
                    {rep ? '報告済み' : '未提出'}
                  </span>
                </div>
                <span className={styles.arrow}>›</span>
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>研修指示書</span>
              <button className={styles.modalClose} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className={styles.scrollArea}>
              <div className={styles.detailSection}>
                <p className={styles.detailDate}>{fmtFullDate(selected.date)}</p>
                <p className={styles.detailDept}>{getDeptName(selected.department_id)}</p>
              </div>

              {DETAIL_FIELDS.filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className={styles.detailRow}>
                  <span className={styles.detailLabel}>{label}</span>
                  <span className={styles.detailValue}>{value}</span>
                </div>
              ))}

              {(() => {
                const rep = getReport(selected.id)
                if (rep) {
                  return (
                    <div className={styles.reportBox}>
                      <p className={styles.reportBoxTitle}>提出済みの報告書</p>
                      <div className={styles.reportRow}>
                        <span className={styles.reportLabel}>学んだこと</span>
                        <p className={styles.reportText}>{rep.learned}</p>
                      </div>
                      {rep.impression && (
                        <div className={styles.reportRow}>
                          <span className={styles.reportLabel}>感想</span>
                          <p className={styles.reportText}>{rep.impression}</p>
                        </div>
                      )}
                    </div>
                  )
                }
                if (showReportForm) {
                  return (
                    <div className={styles.reportForm}>
                      <p className={styles.reportFormTitle}>報告書を提出する</p>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>学んだこと *</label>
                        <textarea
                          className={`${styles.input} ${styles.textarea}`}
                          value={reportForm.learned}
                          onChange={e => setReportForm(f => ({ ...f, learned: e.target.value }))}
                          placeholder="研修で学んだことを記入してください"
                          rows={4}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>感想（任意）</label>
                        <textarea
                          className={`${styles.input} ${styles.textarea}`}
                          value={reportForm.impression}
                          onChange={e => setReportForm(f => ({ ...f, impression: e.target.value }))}
                          placeholder="研修の感想を記入してください"
                          rows={3}
                        />
                      </div>
                      <div className={styles.formActions}>
                        <button className={styles.cancelBtn} onClick={() => setShowReportForm(false)} disabled={submitting}>
                          キャンセル
                        </button>
                        <button
                          className={styles.submitBtn}
                          onClick={submitReport}
                          disabled={submitting || !reportForm.learned.trim()}
                        >
                          {submitting ? '提出中...' : '提出する'}
                        </button>
                      </div>
                    </div>
                  )
                }
                return (
                  <button className={styles.reportOpenBtn} onClick={() => setShowReportForm(true)}>
                    報告書を提出する
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
