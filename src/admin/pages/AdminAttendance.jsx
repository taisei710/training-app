import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MEMBERS } from '../../lib/constants'
import styles from './AdminAttendance.module.css'

const GOAL_HOURS = 80

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

export default function AdminAttendance() {
  const [activeTab, setActiveTab]   = useState('clock')

  // 今月の範囲
  const _now       = new Date()
  const monthStart = new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd   = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).toISOString().slice(0, 10)

  // ── 打刻 ──────────────────────────────────────────────
  const [records, setRecords]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterMember, setFilter]   = useState('all')
  const [editRec, setEditRec]       = useState(null)
  const [editForm, setEditForm]     = useState({ clockIn: '', clockOut: '' })
  const [saving, setSaving]         = useState(false)
  const [confirmId, setConfirmId]   = useState(null)
  const [deleting, setDeleting]     = useState(false)

  // ── 交通費 ────────────────────────────────────────────
  const [transRecs, setTransRecs]   = useState([])
  const [transLoading, setTL]       = useState(true)
  const [transFilter, setTF]        = useState('all')
  const [showSettled, setShowSettled] = useState(false)
  const [editTrans, setEditTrans]   = useState(null)
  const [editTransForm, setETF]     = useState({ date: '', amount: '', note: '' })
  const [savingTrans, setST]        = useState(false)
  const [confirmTransId, setCTI]    = useState(null)
  const [deletingTrans, setDT]      = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [bulkSettlingMember, setBSM] = useState(null)
  const [confirmBulkAll, setConfirmBulkAll] = useState(false)
  const [bulkSettlingAll, setBSA]   = useState(false)

  const loadClocks = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .order('clock_in', { ascending: false })
      .limit(200)
    if (data) setRecords(data)
    setLoading(false)
  }, [])

  const loadTrans = useCallback(async () => {
    const { data } = await supabase
      .from('transportation')
      .select('*')
      .order('date', { ascending: false })
      .limit(200)
    if (data) setTransRecs(data)
    setTL(false)
  }, [])

  useEffect(() => { loadClocks(); loadTrans() }, [loadClocks, loadTrans])

  // ── 打刻 helpers ──────────────────────────────────────
  const getMemberHours = (memberId) =>
    records
      .filter(r => r.member_id === memberId && r.total_hours != null)
      .reduce((s, r) => s + r.total_hours, 0)

  const filteredClocks = filterMember === 'all'
    ? records
    : records.filter(r => r.member_id === filterMember)

  const openEditClock = (r) => {
    setEditRec(r)
    setEditForm({ clockIn: toDatetimeLocal(r.clock_in), clockOut: r.clock_out ? toDatetimeLocal(r.clock_out) : '' })
  }

  const saveClock = async () => {
    if (saving || !editRec || !editForm.clockIn) return
    setSaving(true)
    const inTime  = new Date(editForm.clockIn)
    const outTime = editForm.clockOut ? new Date(editForm.clockOut) : null
    const hours   = outTime ? Math.round((outTime - inTime) / 36000) / 100 : null
    const { error } = await supabase.from('attendance').update({
      clock_in:    inTime.toISOString(),
      clock_out:   outTime ? outTime.toISOString() : null,
      total_hours: hours,
    }).eq('id', editRec.id)
    if (!error) { await loadClocks(); setEditRec(null) }
    setSaving(false)
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
  const getMemberUnsettledTrans = (memberId) =>
    transRecs
      .filter(r => r.member_id === memberId && !r.settled)
      .reduce((s, r) => s + r.amount, 0)

  const getUnsettledThisMonth = (memberId) =>
    transRecs.filter(r =>
      r.member_id === memberId && !r.settled &&
      r.date >= monthStart && r.date <= monthEnd
    )

  const unsettledThisMonthAll = transRecs.filter(
    r => !r.settled && r.date >= monthStart && r.date <= monthEnd
  )
  const unsettledThisMonthAmount = unsettledThisMonthAll.reduce((s, r) => s + r.amount, 0)

  const filteredTrans = (transFilter === 'all' ? transRecs : transRecs.filter(r => r.member_id === transFilter))
    .filter(r => showSettled || !r.settled)

  const openEditTrans = (r) => {
    setEditTrans(r)
    setETF({ date: r.date, amount: String(r.amount), note: r.note || '' })
  }

  const saveTrans = async () => {
    if (savingTrans || !editTrans || !editTransForm.date || !editTransForm.amount) return
    setST(true)
    const { error } = await supabase.from('transportation').update({
      date:   editTransForm.date,
      amount: Number(editTransForm.amount),
      note:   editTransForm.note.trim() || null,
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

  const toggleSettled = async (r) => {
    if (togglingId) return
    setTogglingId(r.id)
    const newVal = !r.settled
    await supabase.from('transportation').update({
      settled:    newVal,
      settled_at: newVal ? new Date().toISOString() : null,
    }).eq('id', r.id)
    await loadTrans()
    setTogglingId(null)
  }

  const bulkSettleMember = async (memberId) => {
    setBSM(memberId)
    await supabase.from('transportation')
      .update({ settled: true, settled_at: new Date().toISOString() })
      .eq('member_id', memberId)
      .eq('settled', false)
      .gte('date', monthStart)
      .lte('date', monthEnd)
    await loadTrans()
    setBSM(null)
  }

  const bulkSettleAll = async () => {
    setBSA(true)
    await supabase.from('transportation')
      .update({ settled: true, settled_at: new Date().toISOString() })
      .eq('settled', false)
      .gte('date', monthStart)
      .lte('date', monthEnd)
    await loadTrans()
    setConfirmBulkAll(false)
    setBSA(false)
  }

  const confirmClockTarget = records.find(r => r.id === confirmId)
  const confirmTransTarget  = transRecs.find(r => r.id === confirmTransId)

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>勤怠管理</h2>
      </header>

      {/* Tab switcher */}
      <div className={styles.tabRow}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'clock' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('clock')}
        >
          打刻記録
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'trans' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('trans')}
        >
          交通費
        </button>
      </div>

      {/* ════════ 打刻タブ ════════ */}
      {activeTab === 'clock' && (
        <>
          <div className={styles.summaryGrid}>
            {MEMBERS.map(m => {
              const hours = getMemberHours(m.id)
              const pct   = Math.min((hours / GOAL_HOURS) * 100, 100)
              return (
                <button
                  key={m.id}
                  className={`${styles.summaryCard} ${filterMember === m.id ? styles.summaryCardActive : ''}`}
                  onClick={() => setFilter(prev => prev === m.id ? 'all' : m.id)}
                >
                  <p className={styles.summaryName}>{m.name}</p>
                  <p className={styles.summaryHours}>
                    <strong>{loading ? '…' : fmtH(hours)}</strong>
                    <span className={styles.summaryGoal}>/{GOAL_HOURS}h</span>
                  </p>
                  <div className={styles.summaryTrack}>
                    <div
                      className={styles.summaryBar}
                      style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--primary)' }}
                    />
                  </div>
                  <p className={styles.summaryPct}>{Math.round(pct)}%</p>
                </button>
              )
            })}
          </div>

          {filterMember !== 'all' && (
            <div className={styles.filterBadge}>
              {MEMBERS.find(m => m.id === filterMember)?.name} のみ表示
              <button className={styles.filterClear} onClick={() => setFilter('all')}>✕ 解除</button>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>打刻記録</h3>
            {loading ? (
              <div className={styles.loading}>読み込み中...</div>
            ) : filteredClocks.length === 0 ? (
              <p className={styles.noRecords}>記録がありません</p>
            ) : (
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
          {/* Top bar: 全員一括精算 + 精算済みトグル */}
          <div className={styles.transTopBar}>
            {unsettledThisMonthAll.length > 0 ? (
              <button className={styles.bulkSettleAllBtn} onClick={() => setConfirmBulkAll(true)}>
                今月分を全員一括精算（{unsettledThisMonthAll.length}件・{fmtYen(unsettledThisMonthAmount)}）
              </button>
            ) : (
              <span />
            )}
            <button
              className={`${styles.showSettledBtn} ${showSettled ? styles.showSettledBtnActive : ''}`}
              onClick={() => setShowSettled(v => !v)}
            >
              {showSettled ? '未精算のみ' : '精算済みも表示'}
            </button>
          </div>

          {/* Member summary cards (div, not button, to allow nested buttons) */}
          <div className={styles.summaryGrid}>
            {MEMBERS.map(m => {
              const unsettledTotal       = getMemberUnsettledTrans(m.id)
              const thisMonthUnsettled   = getUnsettledThisMonth(m.id)
              const unsettledCount       = transRecs.filter(r => r.member_id === m.id && !r.settled).length
              return (
                <div
                  key={m.id}
                  className={`${styles.summaryCard} ${styles.summaryCardClickable} ${transFilter === m.id ? styles.summaryCardActive : ''}`}
                  onClick={() => setTF(prev => prev === m.id ? 'all' : m.id)}
                >
                  <p className={styles.summaryName}>{m.name}</p>
                  <p className={styles.summaryYen}>
                    <strong>{transLoading ? '…' : fmtYen(unsettledTotal)}</strong>
                  </p>
                  <p className={styles.summaryCount}>未精算 {unsettledCount}件</p>
                  {thisMonthUnsettled.length > 0 && (
                    <button
                      className={styles.memberSettleBtn}
                      onClick={e => { e.stopPropagation(); bulkSettleMember(m.id) }}
                      disabled={bulkSettlingMember === m.id}
                    >
                      {bulkSettlingMember === m.id ? '処理中...' : '今月分を一括精算'}
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
            <h3 className={styles.sectionTitle}>交通費明細</h3>
            {transLoading ? (
              <div className={styles.loading}>読み込み中...</div>
            ) : filteredTrans.length === 0 ? (
              <p className={styles.noRecords}>
                {showSettled ? '申請がありません' : '未精算の申請がありません'}
              </p>
            ) : (
              <div className={styles.recordList}>
                {filteredTrans.map(r => {
                  const member = MEMBERS.find(m => m.id === r.member_id)
                  return (
                    <div
                      key={r.id}
                      className={`${styles.transItem} ${r.settled ? styles.transItemSettled : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.settledCheckbox}
                        checked={r.settled || false}
                        onChange={() => toggleSettled(r)}
                        disabled={togglingId === r.id}
                      />
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
              <span className={styles.modalTitle}>交通費を編集</span>
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

      {/* ════════ 全員一括精算 確認ダイアログ ════════ */}
      {confirmBulkAll && (
        <div className={styles.overlay} onClick={() => setConfirmBulkAll(false)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <p className={styles.dialogTitle}>今月分を全員一括精算</p>
            <p className={styles.dialogMsg}>
              {unsettledThisMonthAll.length}件・{fmtYen(unsettledThisMonthAmount)} を精算済みにします。
              {'\n'}よろしいですか？
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmBulkAll(false)} disabled={bulkSettlingAll}>
                キャンセル
              </button>
              <button className={styles.saveBtn} onClick={bulkSettleAll} disabled={bulkSettlingAll}>
                {bulkSettlingAll ? '処理中...' : '精算する'}
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
            <p className={styles.dialogTitle}>交通費を削除しますか？</p>
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
