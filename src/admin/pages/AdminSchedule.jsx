import { Fragment, useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MEMBERS } from '../../lib/constants'
import styles from './AdminSchedule.module.css'

const DEPT_OPTIONS = [
  { id: 'kouji', label: '工事部',   color: '#378ADD', light: '#EBF4FD' },
  { id: 'eigyo', label: '技術営業', color: '#1D9E75', light: '#E8F7F2' },
  { id: 'jimu',  label: '営業事務', color: '#EF9F27', light: '#FEF5E6' },
  { id: 'soumu', label: '総務',     color: '#888888', light: '#F2F2F2' },
  { id: 'other', label: 'その他',   color: '#7F77DD', light: '#EFEEFC' },
]
const DEPT_MAP = Object.fromEntries(DEPT_OPTIONS.map(d => [d.id, d]))

const TIME_OPTIONS = (() => {
  const opts = []
  for (let h = 6; h <= 22; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opts
})()

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function pad(n) { return String(n).padStart(2, '0') }

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${parseInt(h)}:${m}`
}

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatWeekRange(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const DAY_JP = ['日', '月', '火', '水', '木', '金', '土']
  const s = `${weekStart.getMonth() + 1}/${weekStart.getDate()}(月)`
  const e = `${end.getMonth() + 1}/${end.getDate()}(${DAY_JP[end.getDay()]})`
  return `${s}〜${e}`
}

export default function AdminSchedule() {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const [weekStart, setWeekStart] = useState(() => getWeekStart(now))
  const [avails, setAvails]       = useState([])
  const [shifts, setShifts]       = useState([])
  const [monthShifts, setMonthShifts] = useState([])
  const [selectedCell, setSelectedCell] = useState(null)
  const [modalForm, setModalForm] = useState({ deptId: 'jimu', startTime: '09:00', endTime: '18:00', note: '' })
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const weekFrom  = toDateStr(weekDates[0])
  const weekTo    = toDateStr(weekDates[6])

  const loadWeek = useCallback(async () => {
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('availability').select('*').gte('date', weekFrom).lte('date', weekTo),
      supabase.from('shifts').select('*').gte('date', weekFrom).lte('date', weekTo),
    ])
    if (aData) setAvails(aData)
    if (sData) setShifts(sData)
  }, [weekFrom, weekTo])

  useEffect(() => { loadWeek() }, [loadWeek])

  useEffect(() => {
    const y = now.getFullYear()
    const m = now.getMonth()
    const mFrom = `${y}-${pad(m + 1)}-01`
    const mTo   = `${y}-${pad(m + 1)}-${new Date(y, m + 1, 0).getDate()}`
    supabase.from('shifts').select('*').gte('date', mFrom).lte('date', mTo)
      .then(({ data }) => { if (data) setMonthShifts(data) })
  }, [])

  const prevWeek = () => setWeekStart(ws => {
    const d = new Date(ws); d.setDate(d.getDate() - 7); return d
  })
  const nextWeek = () => setWeekStart(ws => {
    const d = new Date(ws); d.setDate(d.getDate() + 7); return d
  })
  const goToday = () => setWeekStart(getWeekStart(now))

  const openCell = (dateStr, memberId) => {
    const shift = shifts.find(s => s.date === dateStr && s.member_id === memberId)
    setModalForm({
      deptId:    shift?.department_id             ?? 'jimu',
      startTime: shift?.start_time?.slice(0, 5)  ?? '09:00',
      endTime:   shift?.end_time?.slice(0, 5)     ?? '18:00',
      note:      shift?.note                      ?? '',
    })
    setSelectedCell({ date: dateStr, memberId })
  }

  const saveShift = async () => {
    if (saving) return
    setSaving(true)
    await supabase.from('shifts').upsert(
      {
        member_id:     selectedCell.memberId,
        date:          selectedCell.date,
        department_id: modalForm.deptId,
        start_time:    modalForm.startTime,
        end_time:      modalForm.endTime,
        note:          modalForm.note || null,
      },
      { onConflict: 'member_id,date' }
    )
    await loadWeek()
    setSaving(false)
    setSelectedCell(null)
  }

  const deleteShift = async () => {
    if (saving) return
    setSaving(true)
    await supabase.from('shifts')
      .delete()
      .eq('member_id', selectedCell.memberId)
      .eq('date', selectedCell.date)
    await loadWeek()
    setSaving(false)
    setSelectedCell(null)
  }

  const selAvail = selectedCell
    ? avails.find(a => a.date === selectedCell.date && a.member_id === selectedCell.memberId)
    : null
  const selShift = selectedCell
    ? shifts.find(s => s.date === selectedCell.date && s.member_id === selectedCell.memberId)
    : null
  const selMember = selectedCell ? MEMBERS.find(m => m.id === selectedCell.memberId) : null

  const curMonth = now.getMonth() + 1

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>スケジュール</h2>
      </header>

      {/* ── Week navigation ── */}
      <div className={styles.weekNav}>
        <button className={styles.weekNavBtn} onClick={prevWeek}>‹</button>
        <div className={styles.weekNavCenter}>
          <span className={styles.weekLabel}>{formatWeekRange(weekStart)}</span>
          <button className={styles.todayBtn} onClick={goToday}>今週</button>
        </div>
        <button className={styles.weekNavBtn} onClick={nextWeek}>›</button>
      </div>

      {/* ── Weekly grid ── */}
      <div className={styles.gridWrapper}>
        <div className={styles.weekGrid}>
          {/* Header */}
          <div className={styles.cornerCell} />
          {MEMBERS.map(m => (
            <div key={m.id} className={styles.memberHeader}>
              {m.name.slice(0, 2)}
            </div>
          ))}

          {/* Rows */}
          {weekDates.map((date, di) => {
            const ds      = toDateStr(date)
            const isToday = ds === todayStr
            const isWkEnd = di >= 5
            return (
              <Fragment key={ds}>
                <div className={`${styles.dateCell} ${isToday ? styles.dateCellToday : ''}`}>
                  <span className={`${styles.dateMD} ${isWkEnd ? styles.weekendText : ''}`}>
                    {date.getMonth() + 1}/{date.getDate()}
                  </span>
                  <span className={`${styles.dateDay} ${isWkEnd ? styles.weekendText : ''}`}>
                    {DAY_LABELS[di]}
                  </span>
                </div>
                {MEMBERS.map(m => {
                  const avail = avails.find(a => a.date === ds && a.member_id === m.id)
                  const shift = shifts.find(s => s.date === ds && s.member_id === m.id)
                  const dept  = shift ? DEPT_MAP[shift.department_id] : null
                  const isAvail = avail?.status === 'available'
                  const isNo    = avail?.status === 'unavailable'
                  return (
                    <button
                      key={m.id}
                      className={[
                        styles.gridCell,
                        shift   ? styles.gridCellShift : '',
                        isAvail ? styles.gridCellAvail : '',
                        isNo    ? styles.gridCellNo    : '',
                        isToday ? styles.gridCellToday : '',
                      ].filter(Boolean).join(' ')}
                      style={shift ? { background: dept.light } : {}}
                      onClick={() => openCell(ds, m.id)}
                    >
                      {shift ? (
                        <>
                          <span className={styles.cellDept} style={{ color: dept.color }}>
                            {dept.label}
                          </span>
                          <span className={styles.cellTime}>
                            {fmtTime(shift.start_time)}-{fmtTime(shift.end_time)}
                          </span>
                        </>
                      ) : isAvail ? (
                        <>
                          <span className={styles.cellAvailMark}>○</span>
                          {avail.start_time && (
                            <span className={styles.cellAvailTime}>
                              {fmtTime(avail.start_time)}-{fmtTime(avail.end_time)}
                            </span>
                          )}
                        </>
                      ) : isNo ? (
                        <span className={styles.cellNoMark}>×</span>
                      ) : (
                        <span className={styles.cellEmpty}>—</span>
                      )}
                    </button>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Monthly summary ── */}
      <div className={styles.summary}>
        <h3 className={styles.summaryTitle}>{curMonth}月 確定シフト</h3>
        <div className={styles.summaryGrid}>
          {MEMBERS.map(m => {
            const ms    = monthShifts.filter(s => s.member_id === m.id)
            const hours = ms.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)
            return (
              <div key={m.id} className={styles.summaryCard}>
                <p className={styles.summaryName}>{m.name.slice(0, 2)}</p>
                <p className={styles.summaryCount}>
                  {ms.length}<span className={styles.summaryUnit}>回</span>
                </p>
                <p className={styles.summaryHours}>
                  {hours % 1 === 0 ? hours : hours.toFixed(1)}<span className={styles.summaryUnit}>h</span>
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Shift input modal ── */}
      {selectedCell && (
        <div className={styles.overlay} onClick={() => setSelectedCell(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {selectedCell.date.slice(5).replace('-', '/')} {selMember?.name}
              </span>
              <button className={styles.modalClose} onClick={() => setSelectedCell(null)}>✕</button>
            </div>

            {/* Availability reference */}
            <div className={styles.availRef}>
              <span className={styles.availRefLabel}>申告状況：</span>
              {selAvail?.status === 'available' ? (
                <span className={styles.availRefAvail}>
                  ○ 参加可　{fmtTime(selAvail.start_time)}〜{fmtTime(selAvail.end_time)}
                </span>
              ) : selAvail?.status === 'unavailable' ? (
                <span className={styles.availRefNo}>× 参加不可</span>
              ) : (
                <span className={styles.availRefUnknown}>未回答</span>
              )}
            </div>

            {/* Dept buttons */}
            <p className={styles.modalSectionLabel}>部署</p>
            <div className={styles.deptGrid}>
              {DEPT_OPTIONS.map(d => (
                <button
                  key={d.id}
                  className={`${styles.deptBtn} ${modalForm.deptId === d.id ? styles.deptBtnOn : ''}`}
                  style={modalForm.deptId === d.id ? { background: d.color, borderColor: d.color } : {}}
                  onClick={() => setModalForm(f => ({ ...f, deptId: d.id }))}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Time */}
            <p className={styles.modalSectionLabel}>時間</p>
            <div className={styles.timeRow}>
              <div className={styles.timeField}>
                <label className={styles.timeLabel}>開始</label>
                <select
                  className={styles.timePicker}
                  value={modalForm.startTime}
                  onChange={e => setModalForm(f => ({ ...f, startTime: e.target.value }))}
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
              </div>
              <span className={styles.timeSep}>〜</span>
              <div className={styles.timeField}>
                <label className={styles.timeLabel}>終了</label>
                <select
                  className={styles.timePicker}
                  value={modalForm.endTime}
                  onChange={e => setModalForm(f => ({ ...f, endTime: e.target.value }))}
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
              </div>
            </div>

            {/* Note */}
            <p className={styles.modalSectionLabel}>メモ（任意）</p>
            <div className={styles.noteField}>
              <input
                className={styles.noteInput}
                type="text"
                value={modalForm.note}
                onChange={e => setModalForm(f => ({ ...f, note: e.target.value }))}
                placeholder="備考を入力"
              />
            </div>

            {/* Actions */}
            <div className={styles.modalActions}>
              {selShift && (
                <button className={styles.deleteBtn} onClick={deleteShift} disabled={saving}>
                  削除
                </button>
              )}
              <button className={styles.cancelBtn} onClick={() => setSelectedCell(null)} disabled={saving}>
                キャンセル
              </button>
              <button className={styles.confirmBtn} onClick={saveShift} disabled={saving}>
                {saving ? '保存中...' : '確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
