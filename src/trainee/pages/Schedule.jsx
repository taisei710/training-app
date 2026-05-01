import { Fragment, useState, useEffect, useCallback } from 'react'
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

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

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

function pad(n) { return String(n).padStart(2, '0') }
function toDateStr(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${parseInt(h)}:${m}`
}
function getStoragePath(url, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : null
}

function formatModalDate(ds) {
  const d = new Date(ds + 'T00:00:00')
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${DAYS[d.getDay()]})`
}
function getDeptName(id) {
  return DEPARTMENTS.find(d => d.id === id)?.name ?? id
}

export default function TraineeSchedule({ user }) {
  const now = new Date()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(now))
  const [avails, setAvails]       = useState([])
  const [shifts, setShifts]       = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [form, setForm] = useState({ status: 'unknown', start_time: '09:00', end_time: '18:00', note: '' })
  const [saving, setSaving] = useState(false)

  const [shiftInstructions, setShiftInstructions] = useState({})
  const [instReports, setInstReports]             = useState({})

  const [instFileMap, setInstFileMap]           = useState({})
  const [reportFileMap, setReportFileMap]       = useState({})
  const [instructionView, setInstructionView]   = useState(false)
  const [showReportForm, setShowReportForm]     = useState(false)
  const [reportForm, setReportForm]             = useState({ learned: '', impression: '' })
  const [pendingReportFiles, setPendingReportFiles] = useState([])
  const [submitting, setSubmitting]             = useState(false)
  const [selectedShiftId, setSelectedShiftId]   = useState(null)
  const [editingReport, setEditingReport]       = useState(false)
  const [editReportForm, setEditReportForm]     = useState({ learned: '', impression: '' })
  const [pendingEditFiles, setPendingEditFiles] = useState([])
  const [filesToDelete, setFilesToDelete]       = useState([])
  const [updating, setUpdating]                 = useState(false)

  const todayStr = now.toISOString().slice(0, 10)

  const weekDates = getWeekDates(weekStart)
  const weekFrom  = toDateStr(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate())
  const weekTo    = toDateStr(weekDates[6].getFullYear(), weekDates[6].getMonth(), weekDates[6].getDate())

  const load = useCallback(async () => {
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('availability').select('*').eq('member_id', user.id).gte('date', weekFrom).lte('date', weekTo),
      supabase.from('shifts').select('*').eq('member_id', user.id).gte('date', weekFrom).lte('date', weekTo),
    ])
    if (aData) setAvails(aData)
    if (sData) {
      setShifts(sData)
      if (sData.length) {
        const { data: iData } = await supabase
          .from('training_instructions')
          .select('*')
          .in('shift_id', sData.map(s => s.id))
        const instMap = {}
        if (iData) iData.forEach(inst => { if (inst.shift_id) instMap[inst.shift_id] = inst })
        setShiftInstructions(instMap)
        if (iData?.length) {
          const instIds = iData.map(i => i.id)
          const [{ data: rData }, { data: filesData }] = await Promise.all([
            supabase.from('training_reports').select('*').eq('member_id', user.id).in('instruction_id', instIds),
            supabase.from('instruction_files').select('*').in('instruction_id', instIds).order('created_at'),
          ])
          const reportMap = {}
          if (rData) rData.forEach(r => { reportMap[r.instruction_id] = r })
          setInstReports(reportMap)
          const fileMap = {}
          if (filesData) filesData.forEach(f => {
            if (!fileMap[f.instruction_id]) fileMap[f.instruction_id] = []
            fileMap[f.instruction_id].push(f)
          })
          setInstFileMap(fileMap)
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
        } else {
          setInstReports({})
          setInstFileMap({})
          setReportFileMap({})
        }
      } else {
        setShiftInstructions({})
        setInstReports({})
      }
    }
  }, [weekFrom, weekTo, user.id])

  useEffect(() => { load() }, [load])

  const prevWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate()-7); return d })
  const nextWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate()+7); return d })
  const goToday  = () => setWeekStart(getWeekStart(now))

  const openModal = (ds) => {
    const avail = avails.find(a => a.date === ds)
    const firstShift = shifts.find(s => s.date === ds)
    setSelectedShiftId(firstShift?.id ?? null)
    setForm({
      status:     avail?.status                  ?? 'unknown',
      start_time: avail?.start_time?.slice(0, 5) ?? '09:00',
      end_time:   avail?.end_time?.slice(0, 5)   ?? '18:00',
      note:       avail?.note                    ?? '',
    })
    setSelectedDate(ds)
    setInstructionView(false)
    setShowReportForm(false)
    setEditingReport(false)
    setReportForm({ learned: '', impression: '' })
    setPendingReportFiles([])
  }

  const closeModal = () => {
    setSelectedDate(null)
    setInstructionView(false)
    setEditingReport(false)
  }

  const openEditReport = () => {
    setEditReportForm({
      learned:    instReport?.learned    ?? '',
      impression: instReport?.impression ?? '',
    })
    setPendingEditFiles([])
    setFilesToDelete([])
    setEditingReport(true)
  }

  const cancelEditReport = () => {
    setEditingReport(false)
    setPendingEditFiles([])
    setFilesToDelete([])
  }

  const updateReport = async () => {
    if (updating || !editReportForm.learned.trim() || !instReport) return
    setUpdating(true)

    await supabase.from('training_reports')
      .update({
        learned:    editReportForm.learned.trim(),
        impression: editReportForm.impression.trim() || null,
      })
      .eq('id', instReport.id)

    for (const file of filesToDelete) {
      const path = getStoragePath(file.file_url, 'report-files')
      if (path) await supabase.storage.from('report-files').remove([path])
      if (file.id) {
        await supabase.from('report_files').delete().eq('id', file.id)
      } else {
        await supabase.from('report_files').delete().eq('file_url', file.file_url)
      }
    }

    const newFiles = []
    for (const file of pendingEditFiles) {
      const path = `${instReport.id}/${Date.now()}_${file.name}`
      const { data: storageData } = await supabase.storage.from('report-files').upload(path, file)
      if (storageData) {
        const { data: { publicUrl } } = supabase.storage.from('report-files').getPublicUrl(path)
        await supabase.from('report_files').insert({
          report_id: instReport.id,
          file_name: file.name,
          file_url:  publicUrl,
          file_type: file.type,
        })
        newFiles.push({ file_name: file.name, file_url: publicUrl })
      }
    }

    const keptFiles = (reportFileMap[instReport.id] ?? []).filter(
      f => !filesToDelete.some(d => d.file_url === f.file_url)
    )
    setReportFileMap(prev => ({ ...prev, [instReport.id]: [...keptFiles, ...newFiles] }))
    setInstReports(prev => ({
      ...prev,
      [instruction.id]: {
        ...prev[instruction.id],
        learned:    editReportForm.learned.trim(),
        impression: editReportForm.impression.trim() || null,
      },
    }))

    setUpdating(false)
    setEditingReport(false)
    setPendingEditFiles([])
    setFilesToDelete([])
  }

  const switchShift = (shiftId) => {
    setSelectedShiftId(shiftId)
    setInstructionView(false)
    setShowReportForm(false)
    setEditingReport(false)
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

  const submitReport = async () => {
    if (submitting || !reportForm.learned.trim() || !instruction) return
    setSubmitting(true)
    const { data: inserted } = await supabase.from('training_reports').insert({
      instruction_id: instruction.id,
      member_id:      user.id,
      learned:        reportForm.learned.trim(),
      impression:     reportForm.impression.trim() || null,
    }).select()
    if (inserted?.[0]) {
      const reportId = inserted[0].id
      if (pendingReportFiles.length) {
        const uploadedFiles = []
        for (const file of pendingReportFiles) {
          const path = `${reportId}/${Date.now()}_${file.name}`
          const { data: storageData } = await supabase.storage.from('report-files').upload(path, file)
          if (storageData) {
            const { data: { publicUrl } } = supabase.storage.from('report-files').getPublicUrl(path)
            await supabase.from('report_files').insert({
              report_id: reportId,
              file_name: file.name,
              file_url:  publicUrl,
              file_type: file.type,
            })
            uploadedFiles.push({ file_name: file.name, file_url: publicUrl })
          }
        }
        if (uploadedFiles.length) {
          setReportFileMap(prev => ({ ...prev, [reportId]: uploadedFiles }))
        }
      }
      setInstReports(prev => ({ ...prev, [instruction.id]: inserted[0] }))
    }
    setPendingReportFiles([])
    setShowReportForm(false)
    setSubmitting(false)
  }

  const dateShifts    = shifts.filter(s => s.date === selectedDate).sort((a, b) => a.start_time > b.start_time ? 1 : -1)
  const selectedShift = dateShifts.find(s => s.id === selectedShiftId) ?? dateShifts[0] ?? null
  const instruction   = selectedShift ? shiftInstructions[selectedShift.id] : null
  const instReport    = instruction   ? instReports[instruction.id]          : null

  const DETAIL_FIELDS = instruction ? [
    ['担当者',   instruction.instructor],
    ['研修場所', instruction.location],
    ['最寄り駅', instruction.nearest_station],
    ['開始時刻', instruction.start_time],
    ['終了時刻', instruction.end_time],
    ['服装',     instruction.dress_code],
    ['持ち物',   instruction.items_to_bring],
    ['備考',     instruction.notes],
  ] : []

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>スケジュール</h2>
      </header>

      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevWeek}>‹</button>
        <div className={styles.weekNavCenter}>
          <span className={styles.monthLabel}>{formatWeekRange(weekStart)}</span>
          <button className={styles.todayBtn} onClick={goToday}>今週</button>
        </div>
        <button className={styles.navBtn} onClick={nextWeek}>›</button>
      </div>

      <div className={styles.weekGrid}>
        {weekDates.map((date, di) => {
          const ds        = toDateStr(date.getFullYear(), date.getMonth(), date.getDate())
          const isToday   = ds === todayStr
          const avail     = avails.find(a => a.date === ds)
          const dayShifts = shifts.filter(s => s.date === ds)
          const dayClass  = di === 5 ? styles.satText : di === 6 ? styles.sunText : ''
          return (
            <Fragment key={ds}>
              <div className={`${styles.weekDateCell} ${isToday ? styles.weekDateCellToday : ''}`}>
                <span className={`${styles.weekDateMD} ${dayClass}`}>
                  {date.getMonth()+1}/{date.getDate()}
                </span>
                <span className={`${styles.weekDateDay} ${dayClass}`}>
                  {DAY_LABELS[di]}
                </span>
              </div>
              <button
                className={[
                  styles.weekContentCell,
                  isToday ? styles.weekContentCellToday : '',
                  dayShifts.length === 0 && avail?.status === 'available'   ? styles.weekCellAvail : '',
                  dayShifts.length === 0 && avail?.status === 'unavailable' ? styles.weekCellNo    : '',
                ].filter(Boolean).join(' ')}
                style={dayShifts.length > 0 ? { background: DEPT_MAP[dayShifts[0].department_id]?.light } : {}}
                onClick={() => openModal(ds)}
              >
                {dayShifts.length > 0 ? (
                  dayShifts.map((s, i) => {
                    const d  = DEPT_MAP[s.department_id]
                    const si = shiftInstructions[s.id]
                    const sr = si ? instReports[si.id] : null
                    return (
                      <div key={s.id} className={i > 0 ? styles.cellShiftEntry : undefined}>
                        <span className={styles.cellShiftTime} style={{ color: d?.color }}>
                          {fmtTime(s.start_time)}〜{fmtTime(s.end_time)}
                        </span>
                        <span className={si ? styles.cellInstTagOn : styles.cellInstTagOff}>
                          📋 {si ? '指示書あり' : '指示書なし'}
                        </span>
                        <span className={sr ? styles.cellReportTagDone : styles.cellReportTagOff}>
                          📝 {sr ? '報告書あり' : '報告書なし'}
                        </span>
                      </div>
                    )
                  })
                ) : avail?.status === 'available' ? (
                  <span className={styles.iconAvail}>○</span>
                ) : avail?.status === 'unavailable' ? (
                  <span className={styles.iconNo}>×</span>
                ) : (
                  <span className={styles.iconEmpty}>◌</span>
                )}
              </button>
            </Fragment>
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
                  <button className={styles.backBtn} onClick={() => { setInstructionView(false); setEditingReport(false) }}>‹ 戻る</button>
                  <span className={styles.modalDate}>研修指示書</span>
                  <button className={styles.modalClose} onClick={closeModal}>✕</button>
                </div>

                <div className={styles.instDetailSection}>
                  <p className={styles.instDetailDate}>{formatModalDate(instruction.date)}</p>
                  <p className={styles.instDetailDept}>{getDeptName(instruction.department_id)}</p>
                </div>

                {DETAIL_FIELDS.filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className={styles.instDetailRow}>
                    <span className={styles.instDetailLabel}>{label}</span>
                    <span className={styles.instDetailValue}>{value}</span>
                  </div>
                ))}

                {instFileMap[instruction.id]?.length > 0 && (
                  <div className={styles.instFilesSection}>
                    <p className={styles.instFilesTitle}>添付ファイル</p>
                    {instFileMap[instruction.id].map(f => (
                      <a
                        key={f.id}
                        className={styles.instFileLink}
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 {f.file_name}
                      </a>
                    ))}
                  </div>
                )}

                {instReport ? (
                  editingReport ? (
                    <div className={styles.reportForm}>
                      <p className={styles.reportFormTitle}>報告書を修正する</p>
                      <div className={styles.reportField}>
                        <label className={styles.reportFieldLabel}>学んだこと *</label>
                        <textarea
                          className={styles.reportTextarea}
                          value={editReportForm.learned}
                          onChange={e => setEditReportForm(f => ({ ...f, learned: e.target.value }))}
                          placeholder="研修で学んだことを記入してください"
                          rows={4}
                        />
                      </div>
                      <div className={styles.reportField}>
                        <label className={styles.reportFieldLabel}>感想（任意）</label>
                        <textarea
                          className={styles.reportTextarea}
                          value={editReportForm.impression}
                          onChange={e => setEditReportForm(f => ({ ...f, impression: e.target.value }))}
                          placeholder="研修の感想を記入してください"
                          rows={3}
                        />
                      </div>
                      <div className={styles.reportField}>
                        <label className={styles.reportFieldLabel}>添付ファイル</label>
                        <div className={styles.reportFileList}>
                          {(reportFileMap[instReport.id] ?? [])
                            .filter(f => !filesToDelete.some(d => d.file_url === f.file_url))
                            .map((f, i) => (
                              <div key={f.id ?? i} className={styles.reportFileItem}>
                                <span className={styles.reportFileName}>{f.file_name}</span>
                                <button
                                  type="button"
                                  className={styles.reportFileDeleteBtn}
                                  onClick={() => setFilesToDelete(prev => [...prev, f])}
                                >削除</button>
                              </div>
                            ))
                          }
                          {pendingEditFiles.map((f, i) => (
                            <div key={i} className={`${styles.reportFileItem} ${styles.reportFileItemNew}`}>
                              <span className={styles.reportFileName}>📎 {f.name}（追加）</span>
                              <button
                                type="button"
                                className={styles.reportFileDeleteBtn}
                                onClick={() => setPendingEditFiles(prev => prev.filter((_, j) => j !== i))}
                              >削除</button>
                            </div>
                          ))}
                        </div>
                        <label className={styles.reportFileAddBtn}>
                          ＋ ファイルを添付（PDF・画像）
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png"
                            style={{ display: 'none' }}
                            multiple
                            onChange={e => {
                              const files = Array.from(e.target.files ?? [])
                              if (files.length) setPendingEditFiles(prev => [...prev, ...files])
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                      <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={cancelEditReport} disabled={updating}>
                          キャンセル
                        </button>
                        <button
                          className={styles.saveBtn}
                          onClick={updateReport}
                          disabled={updating || !editReportForm.learned.trim()}
                        >
                          {updating ? '更新中...' : '更新する'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.reportBox}>
                        <div className={styles.reportBoxHeader}>
                          <p className={styles.reportBoxTitle}>提出済みの報告書</p>
                          <button className={styles.editReportBtn} onClick={openEditReport}>修正する</button>
                        </div>
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
                        {reportFileMap[instReport.id]?.length > 0 && (
                          <div className={styles.reportFilesBox}>
                            <p className={styles.reportFilesTitle}>添付ファイル</p>
                            {reportFileMap[instReport.id].map((f, i) => (
                              <a
                                key={f.id ?? i}
                                className={styles.reportFileLink}
                                href={f.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                📎 {f.file_name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )
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
                    <div className={styles.reportField}>
                      <label className={styles.reportFieldLabel}>添付ファイル（任意）</label>
                      {pendingReportFiles.length > 0 && (
                        <div className={styles.reportFileList}>
                          {pendingReportFiles.map((f, i) => (
                            <div key={i} className={styles.reportFileItem}>
                              <span className={styles.reportFileName}>{f.name}</span>
                              <button
                                type="button"
                                className={styles.reportFileDeleteBtn}
                                onClick={() => setPendingReportFiles(prev => prev.filter((_, j) => j !== i))}
                              >削除</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className={styles.reportFileAddBtn}>
                        ＋ ファイルを添付（PDF・画像）
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png"
                          style={{ display: 'none' }}
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files ?? [])
                            if (files.length) setPendingReportFiles(prev => [...prev, ...files])
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.cancelBtn} onClick={() => { setShowReportForm(false); setPendingReportFiles([]) }} disabled={submitting}>
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

                {dateShifts.length > 1 && (
                  <div className={styles.shiftTabRow}>
                    {dateShifts.map((s, i) => (
                      <button
                        key={s.id}
                        className={`${styles.shiftTab} ${selectedShiftId === s.id ? styles.shiftTabActive : ''}`}
                        style={selectedShiftId === s.id ? { color: DEPT_MAP[s.department_id]?.color, borderBottomColor: DEPT_MAP[s.department_id]?.color } : {}}
                        onClick={() => switchShift(s.id)}
                      >
                        {i+1}件目 {fmtTime(s.start_time)}〜{fmtTime(s.end_time)}
                      </button>
                    ))}
                  </div>
                )}

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
                        {!instReport && <span className={styles.instLinkBadge}>報告書未提出</span>}
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
