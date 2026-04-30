import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MEMBERS } from '../../lib/constants'
import styles from './AdminAttendance.module.css'

const GOAL_HOURS = 80

function getDefaultMonth() {
  const today = new Date()
  const d     = today.getDate()
  if (d <= 20) {
    return { year: today.getFullYear(), month: today.getMonth() + 1 }
  }
  const m = today.getMonth() + 2
  if (m > 12) return { year: today.getFullYear() + 1, month: 1 }
  return { year: today.getFullYear(), month: m }
}

function getMonthRange(year, month) {
  const py = month === 1 ? year - 1 : year
  const pm = month === 1 ? 12 : month - 1
  return {
    start: `${py}-${String(pm).padStart(2, '0')}-21`,
    end:   `${year}-${String(month).padStart(2, '0')}-20`,
  }
}

function shiftMonth(ym, delta) {
  let m = ym.month + delta
  let y = ym.year
  if (m > 12) { m -= 12; y++ }
  if (m < 1)  { m += 12; y-- }
  return { year: y, month: m }
}

function fmtClock(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDateLabel(ds) {
  const d = new Date(ds + 'T00:00:00')
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`
}

function fmtH(h) {
  if (h == null) return '—'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

function fmtYen(n) {
  return `¥${Number(n).toLocaleString()}`
}

function toDatetimeLocal(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const EMPTY_ADD_CLOCK = { memberId: '', date: '', clockIn: '', clockOut: '', breakMinutes: 0 }

export default function AdminAttendance() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [activeTab, setActiveTab] = useState('clock')

  // ── 打刻 ──────────────────────────────────────────────
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [clockMonth, setClockMonth]               = useState(getDefaultMonth)
  const [clockDetailMember, setClockDetailMember] = useState(null)
  const [editRec, setEditRec]     = useState(null)
  const [editForm, setEditForm]   = useState({ clockIn: '', clockOut: '', breakMinutes: 0 })
  const [saving, setSaving]       = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const [showAddClock, setShowAddClock] = useState(false)
  const [addClockForm, setAddClockForm] = useState(EMPTY_ADD_CLOCK)
  const [addingClock, setAddingClock]   = useState(false)

  // ── 交通費 ────────────────────────────────────────────
  const [transRecs, setTransRecs]         = useState([])
  const [transLoading, setTL]             = useState(true)
  const [transFilter, setTF]              = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth)
  const [showSettled, setShowSettled]     = useState(false)
  const [selectedIds, setSelectedIds]     = useState(new Set())
  const [editTrans, setEditTrans]         = useState(null)
  const [editTransForm, setETF]           = useState({ date: '', amount: '', note: '' })
  const [savingTrans, setST]              = useState(false)
  const [confirmTransId, setCTI]          = useState(null)
  const [deletingTrans, setDT]            = useState(false)
  const [confirmSettle, setConfirmSettle] = useState(false)
  const [settling, setSettling]           = useState(false)

  // ── ロード ────────────────────────────────────────────
  const loadClocks = useCallback(async () => {
    const { data } = await supabase
      .from('attendance').select('*').order('clock_in', { ascending: false }).limit(1000)
    if (data) setRecords(data)
    setLoading(false)
  }, [])

  const loadTrans = useCallback(async () => {
    const { data } = await supabase
      .from('transportation').select('*').order('date', { ascending: false }).limit(400)
    if (data) setTransRecs(data)
    setTL(false)
  }, [])

  useEffect(() => { loadClocks(); loadTrans() }, [loadClocks, loadTrans])

  // ── 打刻 helpers ──────────────────────────────────────
  const clockRange  = getMonthRange(clockMonth.year, clockMonth.month)
  const monthClocks = records.filter(r => r.date >= clockRange.start && r.date <= clockRange.end)

  const filteredClocks = clockDetailMember
    ? monthClocks.filter(r => r.member_id === clockDetailMember)
    : monthClocks

  const getMonthMemberHours = (memberId) =>
    monthClocks
      .filter(r => r.member_id === memberId && r.total_hours != null)
      .reduce((s, r) => s + r.total_hours, 0)

  const openEditClock = (r) => {
    setEditRec(r)
    setEditForm({
      clockIn:      toDatetimeLocal(r.clock_in),
      clockOut:     r.clock_out ? toDatetimeLocal(r.clock_out) : '',
      breakMinutes: r.break_minutes ?? 0,
    })
  }

  const saveClock = async () => {
    if (saving || !editRec || !editForm.clockIn) return
    setSaving(true)
    const inTime  = new Date(editForm.clockIn)
    const outTime = editForm.clockOut ? new Date(editForm.clockOut) : null
    const workMs  = outTime ? Math.max(0, (outTime - inTime) - editForm.breakMinutes * 60000) : null
    const hours   = workMs != null ? Math.round(workMs / 36000) / 100 : null
    const { error } = await supabase.from('attendance').update({
      clock_in:      inTime.toISOString(),
      clock_out:     outTime ? outTime.toISOString() : null,
      total_hours:   hours,
      break_minutes: editForm.breakMinutes,
    }).eq('id', editRec.id)
    if (!error) { await loadClocks(); setEditRec(null) }
    setSaving(false)
  }

  const saveAddClock = async () => {
    if (addingClock || !addClockForm.memberId || !addClockForm.date || !addClockForm.clockIn) return
    setAddingClock(true)
    const inTime  = new Date(`${addClockForm.date}T${addClockForm.clockIn}`)
    const outTime = addClockForm.clockOut ? new Date(`${addClockForm.date}T${addClockForm.clockOut}`) : null
    const workMs  = outTime ? Math.max(0, (outTime - inTime) - addClockForm.breakMinutes * 60000) : null
    const hours   = workMs != null ? Math.round(workMs / 36000) / 100 : null
    const { error } = await supabase.from('attendance').insert({
      member_id:     addClockForm.memberId,
      date:          addClockForm.date,
      clock_in:      inTime.toISOString(),
      clock_out:     outTime ? outTime.toISOString() : null,
      total_hours:   hours,
      break_minutes: addClockForm.breakMinutes,
    })
    if (!error) {
      await loadClocks()
      setShowAddClock(false)
      setAddClockForm(EMPTY_ADD_CLOCK)
    }
    setAddingClock(false)
  }

  const deleteClock = async () => {
    if (!confirmId || deleting) return
    setDeleting(true)
    const { error } = await supabase.from('attendance').delete().eq('id', confirmId)
    if (!error) setRecords(prev => prev.filter(r => r.id !== confirmId))
    setConfirmId(null)
    setDeleting(false)
  }

  // ── 交通費 helpers ────────────────────────────────────
  const range = getMonthRange(selectedMonth.year, selectedMonth.month)

  const inMonth = (r) => r.date >= range.start && r.date <= range.end

  const memberFilteredTrans = transFilter === 'all'
    ? transRecs : transRecs.filter(r => r.member_id === transFilter)

  const monthRecs      = memberFilteredTrans.filter(inMonth)
  const unsettledMonth = monthRecs.filter(r => !r.settled)
  const displayRecs    = monthRecs.filter(r => showSettled || !r.settled)

  const getMemberMonthUnsettled = (memberId) =>
    transRecs.filter(r => r.member_id === memberId && !r.settled && inMonth(r))

  const changeMonth = (delta) => {
    setSelectedMonth(prev => shiftMonth(prev, delta))
    setSelectedIds(new Set())
  }

  const allSelected = unsettledMonth.length > 0 && unsettledMonth.every(r => selectedIds.has(r.id))

  const selectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(unsettledMonth.map(r => r.id)))
  }

  const selectMember = (memberId) => {
    const ids = getMemberMonthUnsettled(memberId).map(r => r.id)
    setSelectedIds(prev => new Set([...prev, ...ids]))
  }

  const toggleSelect = (id) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectedRecs  = transRecs.filter(r => selectedIds.has(r.id))
  const selectedTotal = selectedRecs.reduce((s, r) => s + r.amount, 0)

  const executeSettle = async () => {
    if (settling || selectedIds.size === 0) return
    setSettling(true)
    await supabase.from('transportation')
      .update({ settled: true, settled_at: new Date().toISOString() })
      .in('id', [...selectedIds])
    await loadTrans()
    setSelectedIds(new Set())
    setConfirmSettle(false)
    setSettling(false)
  }

  const openEditTrans = (r) => {
    setEditTrans(r)
    setETF({ date: r.date, amount: String(r.amount), note: r.note || '' })
  }

  const saveTrans = async () => {
    if (savingTrans || !editTrans || !editTransForm.date || !editTransForm.amount) return
    setST(true)
    const { error } = await supabase.from('transportation').update({
      date: editTransForm.date, amount: Number(editTransForm.amount), note: editTransForm.note.trim() || null,
    }).eq('id', editTrans.id)
    if (!error) { await loadTrans(); setEditTrans(null) }
    setST(false)
  }

  const deleteTrans = async () => {
    if (!confirmTransId || deletingTrans) return
    setDT(true)
    const { error } = await supabase.from('transportation').delete().eq('id', confirmTransId)
    if (!error) setTransRecs(prev => prev.filter(r => r.id !== confirmTransId))
    setCTI(null)
    setDT(false)
  }

  const confirmClockTarget = records.find(r => r.id === confirmId)
  const confirmTransTarget  = transRecs.find(r => r.id === confirmTransId)

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>勤怠管理</h2>
      </header>

      <div className={styles.tabRow}>
        <button className={`${styles.tabBtn} ${activeTab === 'clock' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('clock')}>打刻記録</button>
        <button className={`${styles.tabBtn} ${activeTab === 'trans' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('trans')}>立替経費（交通費など）</button>
      </div>

      {/* ════════ 打刻タブ ════════ */}
      {activeTab === 'clock' && (
        <>
          {/* 月セレクター */}
          <div className={styles.monthSelector}>
            <button className={styles.monthNavBtn} onClick={() => setClockMonth(prev => shiftMonth(prev, -1))}>◀</button>
            <div className={styles.monthLabelWrap}>
              <span className={styles.monthMain}>{clockMonth.year}年{clockMonth.month}月分</span>
              <span className={styles.monthSub}>
                {clockRange.start.slice(5).replace('-', '/')}〜{clockRange.end.slice(5).replace('-', '/')}
              </span>
            </div>
            <button className={styles.monthNavBtn} onClick={() => setClockMonth(prev => shiftMonth(prev, +1))}>▶</button>
          </div>

          {/* メンバーカード */}
          <div className={styles.summaryGrid}>
            {MEMBERS.map(m => {
              const hours = getMonthMemberHours(m.id)
              const pct   = Math.min((hours / GOAL_HOURS) * 100, 100)
              return (
                <button key={m.id}
                  className={`${styles.summaryCard} ${clockDetailMember === m.id ? styles.summaryCardActive : ''}`}
                  onClick={() => setClockDetailMember(prev => prev === m.id ? null : m.id)}>
                  <p className={styles.summaryName}>{m.name}</p>
                  <p className={styles.summaryHours}>
                    <strong>{loading ? '…' : fmtH(hours)}</strong>
                    <span className={styles.summaryGoal}>h</span>
                  </p>
                  <div className={styles.summaryTrack}>
                    <div className={styles.summaryBar}
                      style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--primary)' }} />
                  </div>
                  <p className={styles.summaryPct}>{Math.round(pct)}%</p>
                </button>
              )
            })}
          </div>

          {clockDetailMember && (
            <div className={styles.filterBadge}>
              {MEMBERS.find(m => m.id === clockDetailMember)?.name} のみ表示
              <button className={styles.filterClear} onClick={() => setClockDetailMember(null)}>✕ 解除</button>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>打刻記録</h3>
              <button className={styles.addClockBtn}
                onClick={() => { setAddClockForm({ ...EMPTY_ADD_CLOCK, date: todayStr }); setShowAddClock(true) }}>
                ＋ 打刻を追加
              </button>
            </div>
            {loading ? <div className={styles.loading}>読み込み中...</div>
              : filteredClocks.length === 0 ? <p className={styles.noRecords}>記録がありません</p>
              : (
                <div className={styles.recordList}>
                  {filteredClocks.map(r => {
                    const member = MEMBERS.find(m => m.id === r.member_id)
                    return (
                      <div key={r.id} className={`${styles.recordItem} ${!r.clock_out ? styles.recordOpen : ''}`}>
                        <div className={styles.recordLeft}>
                          <span className={styles.recordDate}>{fmtDateLabel(r.date)}</span>
                          <span className={styles.recordName}>{member?.name ?? r.member_id}</span>
                        </div>
                        <div className={styles.recordCenter}>
                          <span className={styles.recordTime}>{fmtClock(r.clock_in)} 〜 {fmtClock(r.clock_out)}</span>
                          <span className={styles.recordHours}>
                            {r.total_hours != null ? `${fmtH(r.total_hours)}h` : !r.clock_out ? '出勤中' : '—'}
                          </span>
                        </div>
                        <div className={styles.recordActions}>
                          <button className={styles.editBtn} onClick={() => openEditClock(r)}>編集</button>
                          <button className={styles.deleteBtn} onClick={() => setConfirmId(r.id)}>削除</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
        </>
      )}

      {/* ════════ 交通費タブ ════════ */}
      {activeTab === 'trans' && (
        <>
          <div className={styles.monthSelector}>
            <button className={styles.monthNavBtn} onClick={() => changeMonth(-1)}>◀</button>
            <div className={styles.monthLabelWrap}>
              <span className={styles.monthMain}>
                {selectedMonth.year}年{selectedMonth.month}月分
              </span>
              <span className={styles.monthSub}>
                {range.start.slice(5).replace('-', '/')}〜{range.end.slice(5).replace('-', '/')}
              </span>
            </div>
            <button className={styles.monthNavBtn} onClick={() => changeMonth(+1)}>▶</button>
          </div>

          <div className={styles.transActionBar}>
            <div className={styles.transActionLeft}>
              <button
                className={`${styles.selectAllBtn} ${allSelected ? styles.selectAllBtnActive : ''}`}
                onClick={selectAll}
                disabled={unsettledMonth.length === 0}
              >
                {allSelected ? '選択解除' : '今月分を全選択'}
              </button>
            </div>
            <button
              className={`${styles.showSettledBtn} ${showSettled ? styles.showSettledBtnActive : ''}`}
              onClick={() => setShowSettled(v => !v)}>
              {showSettled ? '未精算のみ' : '精算済みも表示'}
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className={styles.settleBar}>
              <div className={styles.settleBarInfo}>
                <span className={styles.settleBarCount}>{selectedIds.size}件選択中</span>
                <span className={styles.settleBarAmount}>{fmtYen(selectedTotal)}</span>
              </div>
              <button className={styles.settleExecBtn} onClick={() => setConfirmSettle(true)}>
                選択した{selectedIds.size}件を精算する
              </button>
            </div>
          )}

          <div className={styles.summaryGrid}>
            {MEMBERS.map(m => {
              const mUnsettled = getMemberMonthUnsettled(m.id)
              const mTotal     = mUnsettled.reduce((s, r) => s + r.amount, 0)
              return (
                <div key={m.id}
                  className={`${styles.summaryCard} ${styles.summaryCardClickable} ${transFilter === m.id ? styles.summaryCardActive : ''}`}
                  onClick={() => setTF(prev => prev === m.id ? 'all' : m.id)}>
                  <p className={styles.summaryName}>{m.name}</p>
                  <p className={styles.summaryYen}>
                    <strong>{transLoading ? '…' : fmtYen(mTotal)}</strong>
                  </p>
                  <p className={styles.summaryCount}>未精算 {mUnsettled.length}件</p>
                  {mUnsettled.length > 0 && (
                    <button className={styles.memberSelectBtn}
                      onClick={e => { e.stopPropagation(); selectMember(m.id) }}>
                      今月分を全選択
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {transFilter !== 'all' && (
            <div className={styles.filterBadge}>
              {MEMBERS.find(m => m.id === transFilter)?.name} のみ表示
              <button className={styles.filterClear} onClick={() => setTF('all')}>✕ 解除</button>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>立替経費（交通費など）明細</h3>
            {transLoading ? <div className={styles.loading}>読み込み中...</div>
              : displayRecs.length === 0 ? (
                <p className={styles.noRecords}>
                  {showSettled ? '申請がありません' : '未精算の申請がありません'}
                </p>
              ) : (
                <div className={styles.recordList}>
                  {displayRecs.map(r => {
                    const member  = MEMBERS.find(m => m.id === r.member_id)
                    const checked = selectedIds.has(r.id)
                    return (
                      <div key={r.id}
                        className={`${styles.transItem} ${r.settled ? styles.transItemSettled : ''}`}>
                        {!r.settled ? (
                          <input type="checkbox" className={styles.settledCheckbox}
                            checked={checked} onChange={() => toggleSelect(r.id)} />
                        ) : (
                          <span className={styles.settledMark}>✓</span>
                        )}
                        <div className={styles.recordLeft}>
                          <span className={styles.recordDate}>{fmtDateLabel(r.date)}</span>
                          <span className={styles.recordName}>{member?.name ?? r.member_id}</span>
                        </div>
                        <div className={styles.transCenter}>
                          <span className={styles.transNote}>{r.note || '—'}</span>
                          <span className={styles.transAmount}>{fmtYen(r.amount)}</span>
                        </div>
                        <div className={styles.recordActions}>
                          <button className={styles.editBtn} onClick={() => openEditTrans(r)}>編集</button>
                          <button className={styles.deleteBtn} onClick={() => setCTI(r.id)}>削除</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
        </>
      )}

      {/* ════════ 精算確認ダイアログ ════════ */}
      {confirmSettle && (
        <div className={styles.overlay} onClick={() => setConfirmSettle(false)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <p className={styles.dialogTitle}>立替経費（交通費など）を精算しますか？</p>
            <p className={styles.dialogMsg}>
              {selectedIds.size}件・{fmtYen(selectedTotal)} を精算済みにします。
              {'\n'}よろしいですか？
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmSettle(false)} disabled={settling}>
                キャンセル
              </button>
              <button className={styles.saveBtn} onClick={executeSettle} disabled={settling}>
                {settling ? '処理中...' : '精算する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 打刻 追加モーダル ════════ */}
      {showAddClock && (
        <div className={styles.overlay} onClick={() => setShowAddClock(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>打刻を追加</span>
              <button className={styles.modalClose} onClick={() => setShowAddClock(false)}>✕</button>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>メンバー</label>
              <select className={styles.input} value={addClockForm.memberId}
                onChange={e => setAddClockForm(f => ({ ...f, memberId: e.target.value }))}>
                <option value="">選択してください</option>
                {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>日付</label>
              <input type="date" className={styles.input} value={addClockForm.date}
                onChange={e => setAddClockForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>出勤時刻</label>
              <input type="time" className={styles.input} value={addClockForm.clockIn}
                onChange={e => setAddClockForm(f => ({ ...f, clockIn: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>退勤時刻（任意）</label>
              <input type="time" className={styles.input} value={addClockForm.clockOut}
                onChange={e => setAddClockForm(f => ({ ...f, clockOut: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>休憩時間（分）</label>
              <input type="number" className={styles.input} value={addClockForm.breakMinutes}
                onChange={e => setAddClockForm(f => ({ ...f, breakMinutes: Math.max(0, Math.min(480, Number(e.target.value) || 0)) }))}
                min={0} max={480} inputMode="numeric" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAddClock(false)} disabled={addingClock}>
                キャンセル
              </button>
              <button className={styles.saveBtn} onClick={saveAddClock}
                disabled={addingClock || !addClockForm.memberId || !addClockForm.date || !addClockForm.clockIn}>
                {addingClock ? '追加中...' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 打刻 編集モーダル ════════ */}
      {editRec && (
        <div className={styles.overlay} onClick={() => setEditRec(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>打刻を編集</span>
              <button className={styles.modalClose} onClick={() => setEditRec(null)}>✕</button>
            </div>
            <p className={styles.modalSub}>
              {MEMBERS.find(m => m.id === editRec.member_id)?.name}　{fmtDateLabel(editRec.date)}
            </p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>出勤時刻</label>
              <input type="datetime-local" className={styles.input} value={editForm.clockIn}
                onChange={e => setEditForm(f => ({ ...f, clockIn: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>退勤時刻（未退勤なら空欄）</label>
              <input type="datetime-local" className={styles.input} value={editForm.clockOut}
                onChange={e => setEditForm(f => ({ ...f, clockOut: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>休憩時間（分）</label>
              <input type="number" className={styles.input} value={editForm.breakMinutes}
                onChange={e => setEditForm(f => ({ ...f, breakMinutes: Math.max(0, Math.min(480, Number(e.target.value) || 0)) }))}
                min={0} max={480} inputMode="numeric" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditRec(null)} disabled={saving}>キャンセル</button>
              <button className={styles.saveBtn} onClick={saveClock} disabled={saving || !editForm.clockIn}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 交通費 編集モーダル ════════ */}
      {editTrans && (
        <div className={styles.overlay} onClick={() => setEditTrans(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>立替経費（交通費など）を編集</span>
              <button className={styles.modalClose} onClick={() => setEditTrans(null)}>✕</button>
            </div>
            <p className={styles.modalSub}>{MEMBERS.find(m => m.id === editTrans.member_id)?.name}</p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>日付</label>
              <input type="date" className={styles.input} value={editTransForm.date}
                onChange={e => setETF(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>金額（円）</label>
              <input type="number" className={styles.input} value={editTransForm.amount}
                onChange={e => setETF(f => ({ ...f, amount: e.target.value }))} min="0" inputMode="numeric" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>メモ（任意）</label>
              <input type="text" className={styles.input} value={editTransForm.note}
                onChange={e => setETF(f => ({ ...f, note: e.target.value }))} placeholder="例: 電車往復" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditTrans(null)} disabled={savingTrans}>キャンセル</button>
              <button className={styles.saveBtn} onClick={saveTrans}
                disabled={savingTrans || !editTransForm.date || !editTransForm.amount}>
                {savingTrans ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 打刻 削除確認 ════════ */}
      {confirmId && (
        <div className={styles.overlay} onClick={() => setConfirmId(null)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <p className={styles.dialogTitle}>打刻を削除しますか？</p>
            <p className={styles.dialogMsg}>
              {MEMBERS.find(m => m.id === confirmClockTarget?.member_id)?.name}
              {confirmClockTarget ? '　' + fmtDateLabel(confirmClockTarget.date) : ''}
              {'\n'}削除後は元に戻せません。
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmId(null)} disabled={deleting}>キャンセル</button>
              <button className={styles.dangerBtn} onClick={deleteClock} disabled={deleting}>
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 交通費 削除確認 ════════ */}
      {confirmTransId && (
        <div className={styles.overlay} onClick={() => setCTI(null)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <p className={styles.dialogTitle}>立替経費（交通費など）を削除しますか？</p>
            <p className={styles.dialogMsg}>
              {MEMBERS.find(m => m.id === confirmTransTarget?.member_id)?.name}
              {confirmTransTarget ? '　' + fmtDateLabel(confirmTransTarget.date) + '　' + fmtYen(confirmTransTarget.amount) : ''}
              {'\n'}削除後は元に戻せません。
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setCTI(null)} disabled={deletingTrans}>キャンセル</button>
              <button className={styles.dangerBtn} onClick={deleteTrans} disabled={deletingTrans}>
                {deletingTrans ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
