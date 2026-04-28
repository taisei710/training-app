import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './Calendar.module.css'

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

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

export default function TraineeCalendar({ user }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [ngList, setNgList] = useState([])
  const [saving, setSaving] = useState(false)

  const todayStr = now.toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const from = `${year}-${pad(month + 1)}-01`
    const to = `${year}-${pad(month + 1)}-${new Date(year, month + 1, 0).getDate()}`
    const { data } = await supabase
      .from('ng_dates')
      .select('id, member_id, date')
      .gte('date', from)
      .lte('date', to)
    if (data) setNgList(data)
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const toggle = async (day) => {
    if (!day || saving) return
    setSaving(true)
    const ds = toDateStr(year, month, day)
    const mine = ngList.find(n => n.date === ds && n.member_id === user.id)
    if (mine) {
      await supabase.from('ng_dates').delete().eq('id', mine.id)
    } else {
      await supabase.from('ng_dates').insert({ member_id: user.id, date: ds })
    }
    await load()
    setSaving(false)
  }

  const days = buildDays(year, month)

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>カレンダー</h2>
      </header>

      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{year}年{month + 1}月</span>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDotOwn} />
          <span>自分のNG日</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDotOther} />
          <span>他メンバーのNG日</span>
        </div>
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
          const ds = toDateStr(year, month, day)
          const isOwn    = ngList.some(n => n.date === ds && n.member_id === user.id)
          const hasOthers = ngList.some(n => n.date === ds && n.member_id !== user.id)
          const isToday  = ds === todayStr
          return (
            <button
              key={day}
              className={`${styles.cell} ${isOwn ? styles.cellOwn : ''}`}
              onClick={() => toggle(day)}
              disabled={saving}
            >
              <span
                className={[
                  styles.dayNum,
                  col === 0 ? styles.sunText : col === 6 ? styles.satText : '',
                  isOwn ? styles.numOwn : isToday ? styles.numToday : '',
                ].filter(Boolean).join(' ')}
              >
                {day}
              </span>
              {hasOthers && <span className={styles.otherDot} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
