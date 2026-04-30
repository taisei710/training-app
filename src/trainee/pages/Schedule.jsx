import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS } from '../../lib/constants'
import styles from './Schedule.module.css'

const DEPT_MAP = {
  kouji: { label: '工事部',   color: '#378ADD', light: '#EBF4FD' },
  eigyo: { label: '技術営業', color: '#1D9E75', light: '#E8F7F2' },
  jimu:  { label: '営業事務', color: '#EF9F27', light: '#FEF5E6' },
  soumu: { label: '総務',     color: '#888888', light: '#F2F2F2' },
  other: { label: 'その他',   color: '#7F77DD', light: '#EFEEFC' },
}

// shifts テーブルの department_id → training_instructions テーブルの department_id
const DEPT_ID_MAP = {
  kouji: 'construction',
  eigyo: 'sales_tech',
  jimu:  'sales_office',
  soumu: 'general',
}

function getDeptName(id) {
  return DEPARTMENTS.find(d => d.id === id)?.name ?? id
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const STATUS_OPTIONS = [
  { value: 'available',   label: '参加できる',   color: '#1D9E75' },
  { value: 'unavailable', label: '参加できない', color: '#EF4444' },
  { value: 'unknown',     label: '未定',        color: '#888888' },
]

const TIME_OPTIONS = (() => {
  const opts = []
  for (let h = 6; h <= 22; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opts
})()

function buildDays(year, month) {
  const first = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const days = Array(first).fill(null)
  for (let d = 1; d <= total; d++) days.push(d)
  while (days.length % 7) days.push(null)
  return days
}

function pad(n) { return String(n).padStart(2, '0') }
function toDateStr(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${parseInt(h)}:${m}`
}
function formatModalDate(ds) {
  const d = new Date(ds + 'T00:00:00')
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${DAYS[d.getDay()]})`
}

export default function TraineeSchedule({ user }) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [avails, setAvails]   = useState([])
  const [shifts, setShifts]   = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [form, setForm] = useState({ status: 'unknown', start_time: '09:00', end_time: '18:00', note: '' })
  const [saving, setSaving] = useState(false)

  // 指示書
  const [instruction, setInstruction]         = useState(null)
  const [instReport, setInstReport]           = useState(null)
  const [instructionView, setInstructionView] = useState(false)
  const [showReportForm, setShowReportForm]   = useState(false)
  const [reportForm, setReportForm]           = useState({ learned: '', impression: '' })
  const [submitting, setSubmitting]           = useState(false)

  const todayStr = now.toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const from = `${year}-${pad(month + 1)}-01`
    const to   = `${year}-${pad(month + 1)}-${new Date(year, month + 1, 0).getDate()}`
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('availability').select('*').eq('member_id', user.id).gte('date', from).lte('date', to),
      supabase.from('shifts').select('*').eq('member_id', user.id).gte('date', from).lte('date', to),
    ])
    if (aData) setAvails(aData)
    if (sData) setShifts(sData)
  }, [year, month, user.id])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const fetchInstruction = useCallback(async (ds, shiftDeptId) => {
    const instDeptId = DEPT_ID_MAP[shiftDeptId] ?? shiftDeptId
    const { data: iData } = await supabase
      .from('training_instructions')
      .select('*')
      .eq('member_id', user.id)
      .eq('date', ds)
      .eq('department_id', instDeptId)
      .limit(1)
    const inst = iData?.[0] ?? null
    setInstruction(inst)
    if (inst) {
      const { data: rData } = await supabase
        .from('training_reports')
        .select('*')
        .eq('instruction_id', inst.id)
        .eq('member_id', user.id)
        .limit(1)
      setInstReport(rData?.[0] ?? null)
    }
  }, [user.id])

  const openModal = (ds) => {
    const avail = avails.find(a => a.date === ds)
    setForm({
      status:     avail?.status                  ?? 'unknown',
      start_time: avail?.start_time?.slice(0, 5) ?? '09:00',
      end_time:   avail?.end_time?.slice(0, 5)   ?? '18:00',
      note:       avail?.note                    ?? '',
    })
    setSelectedDate(ds)
    setInstruction(null)
    setInstReport(null)
    setInstructionView(false)
    setShowReportForm(false)
    setReportForm({ learned: '', impression: '' })
    const shift = shifts.find(s => s.date === ds)
    if (shift) fetchInstruction(ds, shift.department_id)
  }

  const closeModal = () => {
    setSelectedDate(null)
    setInstructionView(false)
  }

  const submitReport = async () => {
    if (submitting || !reportForm.learned.trim() || !instruction) return
    setSubmitting(true)
    await supabase.from('training_reports').insert({
      instruction_id: instruction.id,
      member_id:      user.id,
      learned:        reportForm.learned.trim(),
      impression:     reportForm.impression.trim() || null,
    })
    const { data: rData } = await supabase
      .from('training_reports')
      .select('*')
      .eq('instruction_id', instruction.id)
      .eq('member_id', user.id)
      .limit(1)
    setInstReport(rData?.[0] ?? null)
    setShowReportForm(false)
    setSubmitting(false)
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    await supabase.from('availability').upsert(
      {
        member_id:  user.id,
        date:       selectedDate,
        status:     form.status,
        start_time: form.status === 'available' ? form.start_time : null,
        end_time:   form.status === 'available' ? form.end_time   : null,
        note:       form.note || null,
      },
      { onConflict: 'member_id,date' }
    )
    await load()
    setSaving(false)
    setSelectedDate(null)
  }

  const days = buildDays(year, month)
  const selectedShift = shifts.find(s => s.date === selectedDate)

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>スケジュール</h2>
      </header>

      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{year}年{month + 1}月</span>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.legend}>
        <div className={styles.lgItem}><span className={styles.lgAvail}>○</span><span>参加可</span></div>
        <div className={styles.lgItem}><span className={styles.lgNo}>×</span><span>参加不可</span></div>
        <div className={styles.lgItem}><span className={styles.lgShift}>■</span><span>シフト確定</span></div>
        <div className={styles.lgItem}><span className={styles.lgEmpty}>◌</span><span>未入力</span></div>
      </div>

      <div className={styles.grid}>
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`${styles.dayName} ${i === 0 ? styles.sunText : i === 6 ? styles.satText : ''}`}
          >
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          const col = i % 7
          if (!day) return <div key={`e${i}`} className={styles.emptyCell} />
          const ds    = toDateStr(year, month, day)
          const avail = avails.find(a => a.date === ds)
          const shift = shifts.find(s => s.date === ds)
          const dept  = shift ? DEPT_MAP[shift.department_id] : null
          const isToday = ds === todayStr
          return (
            <button
              key={day}
              className={`${styles.cell} ${isToday ? styles.cellToday : ''}`}
              style={shift ? { background: dept.light } : {}}
              onClick={() => openModal(ds)}
            >
              <span
                className={[
                  styles.dayNum,
                  col === 0 ? styles.sunText : col === 6 ? styles.satText : '',
                  isToday && !shift ? styles.numToday : '',
                ].filter(Boolean).join(' ')}
              >
                {day}
              </span>
              {shift ? (
                <span className={styles.iconShift} style={{ color: dept.color }}>■</span>
              ) : avail?.status === 'available' ? (
                <span className={styles.iconAvail}>○</span>
              ) : avail?.status === 'unavailable' ? (
                <span className={styles.iconNo}>×</span>
              ) : (
                <span className={styles.iconEmpty}>◌</span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {instructionView ? (
              /* ── 指示書詳細ビュー ── */
              <>
                <div className={styles.modalHeader}>
                  <button className={styles.backBtn} onClick={() => setInstructionView(false)}>‹ 戻る</button>
                  <span className={styles.modalDate}>研修指示書</span>
                  <button className={styles.modalClose} onClick={closeModal}>✕</button>
                </div>

                <div className={styles.instDetailSection}>
                  <p className={styles.instDetailDate}>{formatModalDate(instruction.date)}</p>
                  <p className={styles.instDetailDept}>{getDeptName(instruction.department_id)}</p>
                </div>

                {[
                  ['担当者',   instruction.instructor],
                  ['研修場所', instruction.location],
                  ['最寄り駅', instruction.nearest_station],
                  ['開始時刻', instruction.start_time],
                  ['終了時刻', instruction.end_time],
                  ['服装',     instruction.dress_code],
                  ['持ち物',   instruction.items_to_bring],
                  ['備考',     instruction.notes],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className={styles.instDetailRow}>
                    <span className={styles.instDetailLabel}>{label}</span>
                    <span className={styles.instDetailValue}>{value}</span>
                  </div>
                ))}

                {instReport ? (
                  <div className={styles.reportBox}>
                    <p className={styles.reportBoxTitle}>提出済みの報告書</p>
                    <div className={styles.reportRow}>
                      <span className={styles.reportLabel}>学んだこと</span>
                      <p className={styles.reportText}>{instReport.learned}</p>
                    </div>
                    {instReport.impression && (
                      <div className={styles.reportRow}>
                        <span className={styles.reportLabel}>感想</span>
                        <p className={styles.reportText}>{instReport.impression}</p>
                      </div>
                    )}
                  </div>
                ) : showReportForm ? (
                  <div className={styles.reportForm}>
                    <p className={styles.reportFormTitle}>報告書を提出する</p>
                    <div className={styles.reportField}>
                      <label className={styles.reportFieldLabel}>学んだこと *</label>
                      <textarea
                        className={styles.reportTextarea}
                        value={reportForm.learned}
                        onChange={e => setReportForm(f => ({ ...f, learned: e.target.value }))}
                        placeholder="研修で学んだことを記入してください"
                        rows={4}
                      />
                    </div>
                    <div className={styles.reportField}>
                      <label className={styles.reportFieldLabel}>感想（任意）</label>
                      <textarea
                        className={styles.reportTextarea}
                        value={reportForm.impression}
                        onChange={e => setReportForm(f => ({ ...f, impression: e.target.value }))}
                        placeholder="研修の感想を記入してください"
                        rows={3}
                      />
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.cancelBtn} onClick={() => setShowReportForm(false)} disabled={submitting}>
                        キャンセル
                      </button>
                      <button
                        className={styles.saveBtn}
                        onClick={submitReport}
                        disabled={submitting || !reportForm.learned.trim()}
                      >
                        {submitting ? '提出中...' : '提出する'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className={styles.reportOpenBtn} onClick={() => setShowReportForm(true)}>
                    報告書を提出する
                  </button>
                )}
              </>
            ) : (
              /* ── 通常の予定入力ビュー ── */
              <>
                <div className={styles.modalHeader}>
                  <span className={styles.modalDate}>{formatModalDate(selectedDate)}</span>
                  <button className={styles.modalClose} onClick={closeModal}>✕</button>
                </div>

                {selectedShift && (
                  <div
                    className={styles.shiftBanner}
                    style={{
                      background:      DEPT_MAP[selectedShift.department_id]?.light,
                      borderLeftColor: DEPT_MAP[selectedShift.department_id]?.color,
                    }}
                  >
                    <span
                      className={styles.shiftBannerLabel}
                      style={{ color: DEPT_MAP[selectedShift.department_id]?.color }}
                    >
                      ✓ {DEPT_MAP[selectedShift.department_id]?.label} シフト確定
                    </span>
                    <span className={styles.shiftBannerTime}>
                      {fmtTime(selectedShift.start_time)} 〜 {fmtTime(selectedShift.end_time)}
                    </span>
                    {selectedShift.note && (
                      <span className={styles.shiftBannerNote}>{selectedShift.note}</span>
                    )}
                    {instruction && (
                      <button
                        className={styles.instLinkBtn}
                        onClick={() => { setInstructionView(true); setShowReportForm(false) }}
                      >
                        📋 指示書を見る
                        {!instReport && <span className={styles.instLinkBadge}>未提出</span>}
                      </button>
                    )}
                  </div>
                )}

                <p className={styles.sectionLabel}>参加状況を入力</p>
                <div className={styles.statusRow}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`${styles.statusBtn} ${form.status === opt.value ? styles.statusBtnOn : ''}`}
                      style={form.status === opt.value ? { background: opt.color, borderColor: opt.color } : {}}
                      onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.status === 'available' && (
                  <div className={styles.timeRow}>
                    <div className={styles.timeField}>
                      <label className={styles.timeLabel}>開始時間</label>
                      <select
                        className={styles.timePicker}
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                      </select>
                    </div>
                    <span className={styles.timeSep}>〜</span>
                    <div className={styles.timeField}>
                      <label className={styles.timeLabel}>終了時間</label>
                      <select
                        className={styles.timePicker}
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className={styles.noteField}>
                  <label className={styles.noteLabel}>メモ（任意）</label>
                  <input
                    className={styles.noteInput}
                    type="text"
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="一言メモを入力"
                  />
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={closeModal} disabled={saving}>
                    閉じる
                  </button>
                  <button className={styles.saveBtn} onClick={save} disabled={saving}>
                    {saving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
