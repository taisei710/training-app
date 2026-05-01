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

const DEPT_ID_MAP = {
  kouji: 'construction',
  eigyo: 'sales_tech',
  jimu:  'sales_office',
  soumu: 'general',
}

const EMPTY_INST_FORM = {
  instructor: '', location: '', nearest_station: '',
  start_time: '', end_time: '', dress_code: '', items_to_bring: '', notes: '',
}

const TIME_OPTIONS = (() => {
  const opts = []
  for (let h = 6; h <= 22; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opts
})()

const DAY_LABELS   = ['月', '火', '水', '木', '金', '土', '日']
const EMPTY_FORM   = { deptId: 'jimu', startTime: '09:00', endTime: '18:00', note: '', breakMinutes: 0 }
const STATUS_COLORS = { none: '#EF4444', no_report: '#F59E0B', done: '#10B981' }

function pad(n) { return String(n).padStart(2, '0') }
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${parseInt(h)}:${m}`
}
function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
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

  const [weekStart, setWeekStart]       = useState(() => getWeekStart(now))
  const [avails, setAvails]             = useState([])
  const [shifts, setShifts]             = useState([])
  const [monthShifts, setMonthShifts]   = useState([])
  const [selectedCell, setSelectedCell] = useState(null)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [newForm, setNewForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)

  const [shiftInstructions, setShiftInstructions] = useState({})
  const [shiftReports, setShiftReports]           = useState({})
  const [weekStatusMap, setWeekStatusMap]         = useState({})
  const [activeShift, setActiveShift]             = useState(null)
  const [showInstModal, setShowInstModal]         = useState(false)
  const [instForm, setInstForm]                   = useState(EMPTY_INST_FORM)
  const [savingInst, setSavingInst]               = useState(false)
  const [viewReport, setViewReport]               = useState(null)
  const [confirmShiftId, setConfirmShiftId]       = useState(null)
  const [existingInstFiles, setExistingInstFiles] = useState([])
  const [pendingFiles, setPendingFiles]           = useState([])
  const [reportFileMap, setReportFileMap]         = useState({})

  const weekDates = getWeekDates(weekStart)
  const weekFrom  = toDateStr(weekDates[0])
  const weekTo    = toDateStr(weekDates[6])

  const loadWeek = useCallback(async () => {
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('availability').select('*').gte('date', weekFrom).lte('date', weekTo),
      supabase.from('shifts').select('*').gte('date', weekFrom).lte('date', weekTo).order('start_time'),
    ])
    if (aData) setAvails(aData)
    if (sData) {
      setShifts(sData)
      const ids = sData.map(s => s.id)
      if (ids.length) {
        const { data: instData } = await supabase
          .from('training_instructions').select('*').in('shift_id', ids)
        const instMap = {}
        if (instData) instData.forEach(inst => { if (inst.shift_id) instMap[inst.shift_id] = inst })
        setShiftInstructions(instMap)

        const instIds = instData?.map(i => i.id) ?? []
        const reportMap = {}
        if (instIds.length) {
          const { data: rData } = await supabase
            .from('training_reports').select('*').in('instruction_id', instIds)
          if (rData) rData.forEach(r => { reportMap[r.instruction_id] = r })
          const reportIds = rData?.map(r => r.id) ?? []
          if (reportIds.length) {
            const { data: rfData } = await supabase.from('report_files').select('*').in('report_id', reportIds).order('created_at')
            const rfMap = {}
            if (rfData) rfData.forEach(f => {
              if (!rfMap[f.report_id]) rfMap[f.report_id] = []
              rfMap[f.report_id].push(f)
            })
            setReportFileMap(rfMap)
          } else {
            setReportFileMap({})
          }
        }
        setShiftReports(reportMap)

        const statusMap = {}
        ids.forEach(shiftId => {
          const inst = instMap[shiftId]
          if (!inst) statusMap[shiftId] = 'none'
          else if (!reportMap[inst.id]) statusMap[shiftId] = 'no_report'
          else statusMap[shiftId] = 'done'
        })
        setWeekStatusMap(statusMap)
      } else {
        setShiftInstructions({})
        setShiftReports({})
        setWeekStatusMap({})
      }
    }
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
    const cellShifts = shifts.filter(s => s.date === dateStr && s.member_id === memberId)
    const avail = avails.find(a => a.date === dateStr && a.member_id === memberId)
    setShowAddForm(cellShifts.length === 0 && avail?.status === 'available')
    setNewForm(EMPTY_FORM)
    setSelectedCell({ date: dateStr, memberId })
    setShowInstModal(false)
    setActiveShift(null)
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
      break_minutes: newForm.breakMinutes,
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

  const openInstModal = async (shift) => {
    const inst = shiftInstructions[shift.id]
    setActiveShift(shift)
    setInstForm(inst ? {
      instructor:      inst.instructor      ?? '',
      location:        inst.location        ?? '',
      nearest_station: inst.nearest_station ?? '',
      start_time:      inst.start_time      ?? '',
      end_time:        inst.end_time        ?? '',
      dress_code:      inst.dress_code      ?? '',
      items_to_bring:  inst.items_to_bring  ?? '',
      notes:           inst.notes           ?? '',
    } : EMPTY_INST_FORM)
    setPendingFiles([])
    if (inst) {
      const { data } = await supabase.from('instruction_files').select('*').eq('instruction_id', inst.id).order('created_at')
      setExistingInstFiles(data ?? [])
    } else {
      setExistingInstFiles([])
    }
    setShowInstModal(true)
  }

  const deleteInstFile = async (fileId, fileUrl) => {
    const match = fileUrl.match(/\/instruction-files\/(.+)$/)
    if (match) {
      await supabase.storage.from('instruction-files').remove([decodeURIComponent(match[1])])
    }
    await supabase.from('instruction_files').delete().eq('id', fileId)
    setExistingInstFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const saveInst = async () => {
    if (savingInst || !activeShift) return
    setSavingInst(true)
    const existingInst = shiftInstructions[activeShift.id]
    const payload = {
      member_id:       activeShift.member_id,
      department_id:   DEPT_ID_MAP[activeShift.department_id] ?? activeShift.department_id,
      date:            activeShift.date,
      shift_id:        activeShift.id,
      instructor:      instForm.instructor      || null,
      location:        instForm.location        || null,
      nearest_station: instForm.nearest_station || null,
      start_time:      instForm.start_time      || null,
      end_time:        instForm.end_time        || null,
      dress_code:      instForm.dress_code      || null,
      items_to_bring:  instForm.items_to_bring  || null,
      notes:           instForm.notes           || null,
    }
    let instructionId
    if (existingInst) {
      await supabase.from('training_instructions').update(payload).eq('id', existingInst.id)
      instructionId = existingInst.id
    } else {
      const { data: inserted } = await supabase.from('training_instructions').insert(payload).select().single()
      instructionId = inserted?.id
    }
    if (instructionId && pendingFiles.length) {
      for (const file of pendingFiles) {
        const path = `${instructionId}/${Date.now()}_${file.name}`
        const { data: storageData } = await supabase.storage.from('instruction-files').upload(path, file)
        if (storageData) {
          const { data: { publicUrl } } = supabase.storage.from('instruction-files').getPublicUrl(path)
          await supabase.from('instruction_files').insert({
            instruction_id: instructionId,
            file_name:      file.name,
            file_url:       publicUrl,
            file_type:      file.type,
          })
        }
      }
    }
    await loadWeek()
    setSavingInst(false)
    setShowInstModal(false)
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
                            const inst   = shiftInstructions[s.id]
                            const report = inst ? shiftReports[inst.id] : null
                            return (
                              <div key={s.id} className={styles.cellShiftBlock}>
                                <span className={styles.cellShiftTime}>
                                  {fmtTime(s.start_time)}〜{fmtTime(s.end_time)}
                                </span>
                                <span className={inst ? styles.cellInstTagOn : styles.cellInstTagOff}>
                                  📋 {inst ? '指示書あり' : '指示書なし'}
                                </span>
                                <span className={report ? styles.cellReportTagDone : styles.cellReportTagOff}>
                                  📝 {report ? '報告書あり' : '報告書なし'}
                                </span>
                              </div>
                            )
                          })}
                          {dayShifts.length > 2 && (
                            <span className={styles.cellMore}>+{dayShifts.length - 2}件</span>
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
                  const d      = DEPT_MAP[s.department_id]
                  const inst   = shiftInstructions[s.id]
                  const status = weekStatusMap[s.id]
                  const report = inst ? shiftReports[inst.id] : null
                  return (
                    <div key={s.id} className={styles.shiftListItem} style={{ borderLeftColor: d.color }}>
                      <div className={styles.shiftItemHeader}>
                        <span className={styles.shiftItemDept} style={{ color: d.color }}>{d.label}</span>
                        <span className={styles.shiftItemTime}>
                          {fmtTime(s.start_time)} 〜 {fmtTime(s.end_time)}
                          {s.break_minutes > 0 && ` (休憩${s.break_minutes}分)`}
                        </span>
                        {s.note && <span className={styles.shiftItemNote}>{s.note}</span>}
                      </div>
                      <button
                        className={inst ? styles.instEditBtn : styles.instCreateBtn}
                        onClick={() => openInstModal(s)}
                      >
                        📋 {inst ? '指示書を編集' : '指示書を作成'}
                      </button>
                      {report && (
                        <button className={styles.viewReportBtn} onClick={() => setViewReport(report)}>
                          📝 報告書を見る
                        </button>
                      )}
                      <button
                        className={styles.shiftDeleteBtn}
                        onClick={() => setConfirmShiftId(s.id)}
                        disabled={saving}
                      >
                        登録済みシフトの削除
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add form toggle / form */}
            {selAvail?.status === 'available' ? (
              !showAddForm ? (
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

                <div className={styles.breakRow}>
                  <label className={styles.breakLabel}>休憩時間（分）</label>
                  <input
                    type="number"
                    className={styles.breakInput}
                    value={newForm.breakMinutes}
                    onChange={e => setNewForm(f => ({ ...f, breakMinutes: Math.max(0, Math.min(480, Number(e.target.value) || 0)) }))}
                    min={0}
                    max={480}
                    inputMode="numeric"
                  />
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
              )
            ) : (
              <p className={styles.noAvailMsg}>このメンバーはこの日に参加申告がありません</p>
            )}

            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setSelectedCell(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 指示書作成・編集モーダル ── */}
      {showInstModal && activeShift && (
        <div className={styles.instOverlay} onClick={() => setShowInstModal(false)}>
          <div className={styles.instModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {shiftInstructions[activeShift.id] ? '指示書を編集' : '指示書を作成'}
              </span>
              <button className={styles.modalClose} onClick={() => setShowInstModal(false)}>✕</button>
            </div>

            <div className={styles.instPreset}>
              <span className={styles.instPresetItem}>{selMember?.name}</span>
              <span className={styles.instPresetDivider}>／</span>
              <span className={styles.instPresetItem} style={{ color: DEPT_MAP[activeShift.department_id]?.color }}>
                {DEPT_MAP[activeShift.department_id]?.label}
              </span>
              <span className={styles.instPresetDivider}>／</span>
              <span className={styles.instPresetItem}>{activeShift.date.slice(5).replace('-', '/')}</span>
            </div>

            <div className={styles.instScrollArea}>
              {[
                ['担当者',   'instructor',      '例: 山田太郎'],
                ['集合場所', 'location',        '例: 本社2F会議室'],
                ['最寄り駅', 'nearest_station', '例: ○○駅 徒歩5分'],
                ['服装',     'dress_code',      '例: スーツ着用'],
                ['持ち物',   'items_to_bring',  '例: 筆記用具、ノート'],
              ].map(([label, key, placeholder]) => (
                <div key={key} className={styles.instField}>
                  <label className={styles.instFieldLabel}>{label}</label>
                  <input
                    type="text"
                    className={styles.instInput}
                    value={instForm[key]}
                    onChange={e => setInstForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div className={styles.timeRow}>
                <div className={styles.timeField}>
                  <label className={styles.timeLabel}>開始時刻</label>
                  <select
                    className={styles.timePicker}
                    value={instForm.start_time}
                    onChange={e => setInstForm(f => ({ ...f, start_time: e.target.value }))}
                  >
                    <option value="">--</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                  </select>
                </div>
                <span className={styles.timeSep}>〜</span>
                <div className={styles.timeField}>
                  <label className={styles.timeLabel}>終了時刻</label>
                  <select
                    className={styles.timePicker}
                    value={instForm.end_time}
                    onChange={e => setInstForm(f => ({ ...f, end_time: e.target.value }))}
                  >
                    <option value="">--</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.instField}>
                <label className={styles.instFieldLabel}>備考</label>
                <textarea
                  className={styles.instTextarea}
                  value={instForm.notes}
                  onChange={e => setInstForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="その他の注意事項など"
                  rows={3}
                />
              </div>

              <div className={styles.instField}>
                <label className={styles.instFieldLabel}>添付ファイル</label>
                <div className={styles.fileList}>
                  {existingInstFiles.map(f => (
                    <div key={f.id} className={styles.fileItem}>
                      <span className={styles.fileItemName}>{f.file_name}</span>
                      <button
                        type="button"
                        className={styles.fileDeleteBtn}
                        onClick={() => deleteInstFile(f.id, f.file_url)}
                        disabled={savingInst}
                      >削除</button>
                    </div>
                  ))}
                  {pendingFiles.map((f, i) => (
                    <div key={i} className={`${styles.fileItem} ${styles.fileItemPending}`}>
                      <span className={styles.fileItemName}>{f.name}</span>
                      <button
                        type="button"
                        className={styles.fileDeleteBtn}
                        onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                      >削除</button>
                    </div>
                  ))}
                </div>
                <label className={styles.fileAddBtn}>
                  ＋ ファイルを添付（PDF・画像）
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    style={{ display: 'none' }}
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files ?? [])
                      if (files.length) setPendingFiles(prev => [...prev, ...files])
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            <div className={styles.instActions}>
              <button className={styles.skipBtn} onClick={() => setShowInstModal(false)} disabled={savingInst}>
                キャンセル
              </button>
              <button className={styles.createInstBtn} onClick={saveInst} disabled={savingInst}>
                {savingInst ? '保存中...' : shiftInstructions[activeShift.id] ? '更新する' : '作成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 報告書表示モーダル ── */}
      {viewReport && (
        <div className={styles.instOverlay} onClick={() => setViewReport(null)}>
          <div className={styles.instModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>報告書</span>
              <button className={styles.modalClose} onClick={() => setViewReport(null)}>✕</button>
            </div>
            <div className={styles.reportViewBody}>
              <div className={styles.reportViewRow}>
                <span className={styles.reportViewLabel}>学んだこと</span>
                <p className={styles.reportViewText}>{viewReport.learned}</p>
              </div>
              {viewReport.impression && (
                <div className={styles.reportViewRow}>
                  <span className={styles.reportViewLabel}>感想</span>
                  <p className={styles.reportViewText}>{viewReport.impression}</p>
                </div>
              )}
              <div className={styles.reportViewRow}>
                <span className={styles.reportViewLabel}>提出日時</span>
                <p className={styles.reportViewText}>{fmtDateTime(viewReport.created_at)}</p>
              </div>
              {reportFileMap[viewReport.id]?.length > 0 && (
                <div className={styles.reportViewRow}>
                  <span className={styles.reportViewLabel}>添付ファイル</span>
                  <div className={styles.reportFileLinks}>
                    {reportFileMap[viewReport.id].map(f => (
                      <a
                        key={f.id}
                        className={styles.reportFileLink}
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 {f.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.instActions}>
              <button className={styles.createInstBtn} style={{ flex: 1 }} onClick={() => setViewReport(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── シフト削除確認ダイアログ ── */}
      {confirmShiftId && (
        <div className={styles.instOverlay} onClick={() => setConfirmShiftId(null)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmTitle}>このシフトを削除してもよいですか？</p>
            <div className={styles.confirmActions}>
              <button className={styles.skipBtn} onClick={() => setConfirmShiftId(null)}>
                キャンセル
              </button>
              <button
                className={styles.dangerBtn}
                onClick={() => { removeShift(confirmShiftId); setConfirmShiftId(null) }}
                disabled={saving}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
