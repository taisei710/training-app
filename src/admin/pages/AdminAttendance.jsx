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

function toDatetimeLocal(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function AdminAttendance() {
  const [records, setRecords]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterMember, setFilter]   = useState('all')

  // edit
  const [editRec, setEditRec]       = useState(null)
  const [editForm, setEditForm]     = useState({ clockIn: '', clockOut: '' })
  const [saving, setSaving]         = useState(false)

  // delete
  const [confirmId, setConfirmId]   = useState(null)
  const [deleting, setDeleting]     = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .order('clock_in', { ascending: false })
      .limit(200)
    if (data) setRecords(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getMemberHours = (memberId) =>
    records
      .filter(r => r.member_id === memberId && r.total_hours != null)
      .reduce((s, r) => s + r.total_hours, 0)

  const filtered = filterMember === 'all'
    ? records
    : records.filter(r => r.member_id === filterMember)

  // ── Edit ──────────────────────────────────────────────
  const openEdit = (r) => {
    setEditRec(r)
    setEditForm({
      clockIn:  toDatetimeLocal(r.clock_in),
      clockOut: r.clock_out ? toDatetimeLocal(r.clock_out) : '',
    })
  }

  const saveEdit = async () => {
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
    if (!error) {
      await load()
      setEditRec(null)
    }
    setSaving(false)
  }

  // ── Delete ────────────────────────────────────────────
  const executeDelete = async () => {
    if (!confirmId || deleting) return
    setDeleting(true)
    const { error } = await supabase.from('attendance').delete().eq('id', confirmId)
    if (!error) setRecords(prev => prev.filter(r => r.id !== confirmId))
    setConfirmId(null)
    setDeleting(false)
  }

  const confirmTarget = records.find(r => r.id === confirmId)

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>勤怠管理</h2>
      </header>

      {/* Member summary cards */}
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

      {/* Filter label */}
      {filterMember !== 'all' && (
        <div className={styles.filterBadge}>
          {MEMBERS.find(m => m.id === filterMember)?.name} のみ表示
          <button className={styles.filterClear} onClick={() => setFilter('all')}>✕ 解除</button>
        </div>
      )}

      {/* Records list */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>打刻記録</h3>
        {loading ? (
          <div className={styles.loading}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <p className={styles.noRecords}>記録がありません</p>
        ) : (
          <div className={styles.recordList}>
            {filtered.map(r => {
              const member = MEMBERS.find(m => m.id === r.member_id)
              return (
                <div
                  key={r.id}
                  className={`${styles.recordItem} ${!r.clock_out ? styles.recordOpen : ''}`}
                >
                  <div className={styles.recordLeft}>
                    <span className={styles.recordDate}>{fmtDateLabel(r.date)}</span>
                    <span className={styles.recordName}>{member?.name ?? r.member_id}</span>
                  </div>
                  <div className={styles.recordCenter}>
                    <span className={styles.recordTime}>
                      {fmtClock(r.clock_in)} 〜 {fmtClock(r.clock_out)}
                    </span>
                    <span className={styles.recordHours}>
                      {r.total_hours != null ? `${fmtH(r.total_hours)}h` : !r.clock_out ? '出勤中' : '—'}
                    </span>
                  </div>
                  <div className={styles.recordActions}>
                    <button className={styles.editBtn} onClick={() => openEdit(r)}>編集</button>
                    <button className={styles.deleteBtn} onClick={() => setConfirmId(r.id)}>削除</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
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
              <input
                type="datetime-local"
                className={styles.input}
                value={editForm.clockIn}
                onChange={e => setEditForm(f => ({ ...f, clockIn: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>退勤時刻（未退勤なら空欄）</label>
              <input
                type="datetime-local"
                className={styles.input}
                value={editForm.clockOut}
                onChange={e => setEditForm(f => ({ ...f, clockOut: e.target.value }))}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditRec(null)} disabled={saving}>
                キャンセル
              </button>
              <button className={styles.saveBtn} onClick={saveEdit} disabled={saving || !editForm.clockIn}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmId && (
        <div className={styles.overlay} onClick={() => setConfirmId(null)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <p className={styles.dialogTitle}>打刻を削除しますか？</p>
            <p className={styles.dialogMsg}>
              {MEMBERS.find(m => m.id === confirmTarget?.member_id)?.name}
              {confirmTarget ? fmtDateLabel(confirmTarget.date) : ''}
              {'\n'}削除後は元に戻せません。
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmId(null)} disabled={deleting}>
                キャンセル
              </button>
              <button className={styles.dangerBtn} onClick={executeDelete} disabled={deleting}>
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
