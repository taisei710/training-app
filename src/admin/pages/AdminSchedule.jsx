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
const EMPTY_FORM  = { deptId: 'jimu', startTime: '09:00', endTime: '18:00', note: '' }

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
function fmtH(h) { return h % 1 === 0 ? String(h) : h.toFixed(1) }

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}
function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
  })
}
function formatWeekRange(weekStart) {
  const end = new Date(weekStart); end.setDate(end.getDate() + 6)
  const DAY_JP = ['日', '月', '火', '水', '木', '金', '土']
  return `${weekStart.getMonth()+1}/${weekStart.getDate()}(月)〜${end.getMonth()+1}/${end.getDate()}(${DAY_JP[end.getDay()]})`
}

export default function AdminSchedule() {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const [weekStart, setWeekStart]   = useState(() => getWeekStart(now))
  const [avails, setAvails]         = useState([])
  const [shifts, setShifts]         = useState([])
  const [monthShifts, setMonthShifts] = useState([])
  const [selectedCell, setSelectedCell] = useState(null)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [newForm, setNewForm]           = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const weekFrom  = toDateStr(weekDates[0])
  const weekTo    = toDateStr(weekDates[6])

  const loadWeek = useCallback(async () => {
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('availability').select('*').gte('date', weekFrom).lte('date', weekTo),
      supabase.from('shifts').select('*').gte('date', weekFrom).lte('date', weekTo).order('start_time'),
    ])
    if (aData) setAvails(aData)
    if (sData) setShifts(sData)
  }, [weekFrom, weekTo])

  useEffect(() => { loadWeek() }, [loadWeek])

  useEffect(() => {
    const y = now.getFullYear(), m = now.getMonth()
    const mFrom = `${y}-${pad(m+1)}-01`
    const mTo   = `${y}-${pad(m+1)}-${new Date(y, m+1, 0).getDate()}`
    supabase.from('shifts').select('*').gte('date', mFrom).lte('date', mTo)
      .then(({ data }) => { if (data) setMonthShifts(data) })
  }, [])

  const prevWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate()-7); return d })
  const nextWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate()+7); return d })
  const goToday  = () => setWeekStart(getWeekStart(now))

  const openCell = (dateStr, memberId) => {
    const hasShifts = shifts.some(s => s.date === dateStr && s.member_id === memberId)
    setShowAddForm(!hasShifts)
    setNewForm(EMPTY_FORM)
    setSelectedCell({ date: dateStr, memberId })
  }

  const addShift = async () => {
    if (saving) return
    setSaving(true)
    await supabase.from('shifts').insert({
      member_id:     selectedCell.memberId,
      date:          selectedCell.date,
      department_id: newForm.deptId,
      start_time:    newForm.startTime,
      end_time:      newForm.endTime,
      note:          newForm.note || null,
    })
    await loadWeek()
    setSaving(false)
    setShowAddForm(false)
    setNewForm(EMPTY_FORM)
  }

  const removeShift = async (shiftId) => {
    if (saving) return
    setSaving(true)
    await supabase.from('shifts').delete().eq('id', shiftId)
    await loadWeek()
    setSaving(false)
  }

  const selAvail  = selectedCell ? avails.find(a => a.date === selectedCell.date && a.member_id === selectedCell.memberId) : null
  const selShifts = selectedCell ? shifts.filter(s => s.date === selectedCell.date && s.member_id === selectedCell.memberId) : []
  const selMember = selectedCell ? MEMBERS.find(m => m.id === selectedCell.memberId) : null

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
          <div className={styles.cornerCell} />
          {MEMBERS.map(m => (
            <div key={m.id} className={styles.memberHeader}>{m.name.slice(0, 2)}</div>
          ))}

          {weekDates.map((date, di) => {
            const ds      = toDateStr(date)
            const isToday = ds === todayStr
            const isWkEnd = di >= 5
            return (
              <Fragment key={ds}>
                <div className={`${styles.dateCell} ${isToday ? styles.dateCellToday : ''}`}>
                  <span className={`${styles.dateMD} ${isWkEnd ? styles.weekendText : ''}`}>
                    {date.getMonth()+1}/{date.getDate()}
                  </span>
                  <span className={`${styles.dateDay} ${isWkEnd ? styles.weekendText : ''}`}>
                    {DAY_LABELS[di]}
                  </span>
                </div>
                {MEMBERS.map(m => {
                  const avail     = avails.find(a => a.date === ds && a.member_id === m.id)
                  const dayShifts = shifts.filter(s => s.date === ds && s.member_id === m.id)
                  const totalH    = dayShifts.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)
                  const isAvail   = avail?.status === 'available'
                  const isNo      = avail?.status === 'unavailable'
                  const firstDept = dayShifts.length > 0 ? DEPT_MAP[dayShifts[0].department_id] : null
                  return (
                    <button
                      key={m.id}
                      className={[
                        styles.gridCell,
                        dayShifts.length > 0 ? '' : isAvail ? styles.gridCellAvail : isNo ? styles.gridCellNo : '',
                        isToday ? styles.gridCellToday : '',
                      ].filter(Boolean).join(' ')}
                      style={firstDept ? { background: firstDept.light } : {}}
                      onClick={() => openCell(ds, m.id)}
                    >
                      {dayShifts.length > 0 ? (
                        <div className={styles.cellShifts}>
                          {dayShifts.slice(0, 2).map(s => {
                            const d = DEPT_MAP[s.department_id]
                            return (
                              <div key={s.id} className={styles.cellShiftRow}>
                                <span className={styles.cellDept} style={{ color: d.color }}>{d.label}</span>
                                <span className={styles.cellTime}>{fmtTime(s.start_time)}-{fmtTime(s.end_time)}</span>
                              </div>
                            )
                          })}
                          {dayShifts.length > 2 && (
                            <span className={styles.cellMore}>+{dayShifts.length - 2}件</span>
                          )}
                          {dayShifts.length > 1 && (
                            <span className={styles.cellTotal}>計{fmtH(totalH)}h</span>
                          )}
                        </div>
                      ) : isAvail ? (
                        <>
                          <span className={styles.cellAvailMark}>○</span>
                          {avail.start_time && (
                            <span className={styles.cellAvailTime}>{fmtTime(avail.start_time)}-{fmtTime(avail.end_time)}</span>
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
        <h3 className={styles.summaryTitle}>{now.getMonth()+1}月 確定シフト</h3>
        <div className={styles.summaryGrid}>
          {MEMBERS.map(m => {
            const ms    = monthShifts.filter(s => s.member_id === m.id)
            const hours = ms.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0)
            return (
              <div key={m.id} className={styles.summaryCard}>
                <p className={styles.summaryName}>{m.name.slice(0, 2)}</p>
                <p className={styles.summaryCount}>{ms.length}<span className={styles.summaryUnit}>回</span></p>
                <p className={styles.summaryHours}>{fmtH(hours)}<span className={styles.summaryUnit}>h</span></p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Shift modal ── */}
      {selectedCell && (
        <div className={styles.overlay} onClick={() => setSelectedCell(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {selectedCell.date.slice(5).replace('-', '/')}　{selMember?.name}
              </span>
              <button className={styles.modalClose} onClick={() => setSelectedCell(null)}>✕</button>
            </div>

            {/* Availability reference */}
            <div className={styles.availRef}>
              <span className={styles.availRefLabel}>申告：</span>
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

            {/* Registered shifts list */}
            {selShifts.length > 0 && (
              <div className={styles.shiftList}>
                <p className={styles.modalSectionLabel}>登録済みシフト</p>
                {selShifts.map(s => {
                  const d = DEPT_MAP[s.department_id]
                  return (
                    <div key={s.id} className={styles.shiftListItem} style={{ borderLeftColor: d.color }}>
                      <div className={styles.shiftItemInfo}>
                        <span className={styles.shiftItemDept} style={{ color: d.color }}>{d.label}</span>
                        <span className={styles.shiftItemTime}>{fmtTime(s.start_time)} 〜 {fmtTime(s.end_time)}</span>
                        {s.note && <span className={styles.shiftItemNote}>{s.note}</span>}
                      </div>
                      <button
                        className={styles.shiftDeleteBtn}
                        onClick={() => removeShift(s.id)}
                        disabled={saving}
                      >
                        削除
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add form toggle / form */}
            {!showAddForm ? (
              <button className={styles.addShiftBtn} onClick={() => setShowAddForm(true)}>
                ＋ シフトを追加
              </button>
            ) : (
              <div className={styles.addShiftSection}>
                <p className={styles.modalSectionLabel}>シフトを追加</p>

                <div className={styles.deptGrid}>
                  {DEPT_OPTIONS.map(d => (
                    <button
                      key={d.id}
                      className={`${styles.deptBtn} ${newForm.deptId === d.id ? styles.deptBtnOn : ''}`}
                      style={newForm.deptId === d.id ? { background: d.color, borderColor: d.color } : {}}
                      onClick={() => setNewForm(f => ({ ...f, deptId: d.id }))}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className={styles.timeRow}>
                  <div className={styles.timeField}>
                    <label className={styles.timeLabel}>開始</label>
                    <select className={styles.timePicker} value={newForm.startTime}
                      onChange={e => setNewForm(f => ({ ...f, startTime: e.target.value }))}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                    </select>
                  </div>
                  <span className={styles.timeSep}>〜</span>
                  <div className={styles.timeField}>
                    <label className={styles.timeLabel}>終了</label>
                    <select className={styles.timePicker} value={newForm.endTime}
                      onChange={e => setNewForm(f => ({ ...f, endTime: e.target.value }))}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                    </select>
                  </div>
                </div>

                <input
                  className={styles.noteInput}
                  type="text"
                  value={newForm.note}
                  onChange={e => setNewForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="メモ（任意）"
                />

                <div className={styles.addFormActions}>
                  {selShifts.length > 0 && (
                    <button className={styles.cancelAddBtn} onClick={() => setShowAddForm(false)} disabled={saving}>
                      キャンセル
                    </button>
                  )}
                  <button className={styles.addBtn} onClick={addShift} disabled={saving}>
                    {saving ? '追加中...' : '追加する'}
                  </button>
                </div>
              </div>
            )}

            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setSelectedCell(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
