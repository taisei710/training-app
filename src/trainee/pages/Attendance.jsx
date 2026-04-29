import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './Attendance.module.css'

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

function fmtFullDate(d) {
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${DAYS[d.getDay()]})`
}

function fmtH(h) {
  if (h == null) return '—'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

function fmtYen(n) {
  return `¥${Number(n).toLocaleString()}`
}

export default function Attendance({ user }) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // ── 打刻 ──────────────────────────────────────────────
  const [records, setRecords]       = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [clocking, setClocking]     = useState(false)

  // ── 交通費 ────────────────────────────────────────────
  const [transRecs, setTransRecs]   = useState([])
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ date: todayStr, amount: '', note: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadAttendance = useCallback(async () => {
    const [{ data: recent }, { data: allRec }] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('member_id', user.id)
        .order('clock_in', { ascending: false })
        .limit(14),
      supabase
        .from('attendance')
        .select('total_hours')
        .eq('member_id', user.id)
        .not('total_hours', 'is', null),
    ])
    if (recent) setRecords(recent)
    if (allRec) setTotalHours(allRec.reduce((s, r) => s + (r.total_hours || 0), 0))
    setLoading(false)
  }, [user.id])

  const loadTrans = useCallback(async () => {
    const { data } = await supabase
      .from('transportation')
      .select('*')
      .eq('member_id', user.id)
      .order('date', { ascending: false })
      .limit(30)
    if (data) setTransRecs(data)
  }, [user.id])

  useEffect(() => {
    loadAttendance()
    loadTrans()
  }, [loadAttendance, loadTrans])

  const todayRecord = records.find(r => r.date === todayStr)

  const clockIn = async () => {
    if (clocking || todayRecord) return
    setClocking(true)
    await supabase.from('attendance').insert({
      member_id: user.id,
      clock_in:  new Date().toISOString(),
      date:      todayStr,
    })
    await loadAttendance()
    setClocking(false)
  }

  const clockOut = async () => {
    if (clocking || !todayRecord || todayRecord.clock_out) return
    setClocking(true)
    const outTime = new Date()
    const inTime  = new Date(todayRecord.clock_in)
    const hours   = Math.round((outTime - inTime) / 36000) / 100
    await supabase.from('attendance').update({
      clock_out:   outTime.toISOString(),
      total_hours: hours,
    }).eq('id', todayRecord.id)
    await loadAttendance()
    setClocking(false)
  }

  const submitTrans = async () => {
    if (submitting || !form.amount || !form.date) return
    setSubmitting(true)
    await supabase.from('transportation').insert({
      member_id: user.id,
      date:      form.date,
      amount:    Number(form.amount),
      note:      form.note.trim() || null,
    })
    await loadTrans()
    setShowForm(false)
    setForm({ date: todayStr, amount: '', note: '' })
    setSubmitting(false)
  }

  const pct = Math.min((totalHours / GOAL_HOURS) * 100, 100)
  const pastRecords = records.filter(r => r.date !== todayStr)
  const totalTrans  = transRecs.reduce((s, r) => s + r.amount, 0)

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>打刻</h2>
      </header>

      <p className={styles.todayDate}>{fmtFullDate(now)}</p>

      {/* Cumulative hours progress */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>累計勤務時間</span>
          <span className={styles.progressValue}>
            <strong>{loading ? '…' : fmtH(totalHours)}</strong>
            <span className={styles.progressGoal}>/{GOAL_HOURS}h</span>
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--primary)' }}
          />
        </div>
        <p className={styles.progressPct}>
          {pct >= 100 ? '✓ 目標達成！' : `${Math.round(pct)}%`}
        </p>
      </div>

      {/* Clock section */}
      <div className={styles.clockSection}>
        {loading ? (
          <div className={styles.loadingState}>読み込み中...</div>
        ) : !todayRecord ? (
          <>
            <p className={styles.statusText}>本日はまだ出勤していません</p>
            <button className={styles.clockInBtn} onClick={clockIn} disabled={clocking}>
              <span className={styles.btnIcon}>▶</span>
              {clocking ? '処理中...' : '出勤する'}
            </button>
          </>
        ) : !todayRecord.clock_out ? (
          <>
            <div className={styles.statusBadgeIn}>
              <span className={styles.pulseDot} />
              出勤中
            </div>
            <p className={styles.clockedTime}>出勤 {fmtClock(todayRecord.clock_in)}</p>
            <button className={styles.clockOutBtn} onClick={clockOut} disabled={clocking}>
              <span className={styles.btnIcon}>■</span>
              {clocking ? '処理中...' : '退勤する'}
            </button>
          </>
        ) : (
          <>
            <div className={styles.statusBadgeDone}>✓ 本日の打刻済み</div>
            <p className={styles.clockedSummary}>
              {fmtClock(todayRecord.clock_in)} 〜 {fmtClock(todayRecord.clock_out)}
              <span className={styles.summaryHours}>　{fmtH(todayRecord.total_hours)}h</span>
            </p>
          </>
        )}
      </div>

      {/* Recent clock records */}
      <div className={styles.recentSection}>
        <h3 className={styles.recentTitle}>過去の打刻記録</h3>
        {pastRecords.length === 0 ? (
          <p className={styles.noRecords}>記録がありません</p>
        ) : (
          <div className={styles.recordList}>
            {pastRecords.map(r => (
              <div key={r.id} className={`${styles.recordItem} ${!r.clock_out ? styles.recordItemOpen : ''}`}>
                <span className={styles.recordDate}>{fmtDateLabel(r.date)}</span>
                <span className={styles.recordTime}>
                  {fmtClock(r.clock_in)} 〜 {fmtClock(r.clock_out)}
                </span>
                <span className={styles.recordHours}>
                  {r.total_hours != null ? `${fmtH(r.total_hours)}h` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transportation section */}
      <div className={styles.transSection}>
        <div className={styles.transHeader}>
          <div>
            <h3 className={styles.recentTitle}>立替経費（交通費など）</h3>
            <p className={styles.transTotalLabel}>
              累計 <strong className={styles.transTotalValue}>{fmtYen(totalTrans)}</strong>
            </p>
          </div>
          <button className={styles.transApplyBtn} onClick={() => setShowForm(true)}>
            ＋ 申請
          </button>
        </div>

        {transRecs.length === 0 ? (
          <p className={styles.noRecords}>申請がありません</p>
        ) : (
          <div className={styles.recordList}>
            {transRecs.map(r => (
              <div key={r.id} className={styles.transItem}>
                <span className={styles.recordDate}>{fmtDateLabel(r.date)}</span>
                <span className={styles.transNote}>{r.note || '—'}</span>
                <span className={styles.transAmount}>{fmtYen(r.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transportation form modal */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>立替経費を申請（交通費など）</span>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>日付</label>
              <input
                type="date"
                className={styles.input}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>金額（円）</label>
              <input
                type="number"
                className={styles.input}
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="例: 540"
                min="0"
                inputMode="numeric"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>メモ（任意）</label>
              <input
                type="text"
                className={styles.input}
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="例: 電車往復"
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)} disabled={submitting}>
                キャンセル
              </button>
              <button
                className={styles.submitBtn}
                onClick={submitTrans}
                disabled={submitting || !form.amount || !form.date}
              >
                {submitting ? '申請中...' : '申請する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
