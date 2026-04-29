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

export default function AdminAttendance() {
  const [records, setRecords]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterMember, setFilter]   = useState('all')

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
                  <div className={styles.recordRight}>
                    <span className={styles.recordTime}>
                      {fmtClock(r.clock_in)} 〜 {fmtClock(r.clock_out)}
                    </span>
                    <span className={styles.recordHours}>
                      {r.total_hours != null ? `${fmtH(r.total_hours)}h` : !r.clock_out ? '出勤中' : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
