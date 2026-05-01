import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS } from '../../lib/constants'
import styles from './AdminHome.module.css'

const DEPTS = [
  { id: 'kouji', label: '工事部体験',   color: '#378ADD', goal: 80 },
  { id: 'eigyo', label: '技術営業体験', color: '#1D9E75', goal: 80 },
  { id: 'jimu',  label: '営業事務体験', color: '#EF9F27', goal: 80 },
]

function calcHours(start, end, breakMin = 0) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm - breakMin) / 60)
}

function fmtH(h) {
  if (!h) return '0'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export default function AdminHome() {
  const navigate = useNavigate()
  const [memberDeptHours, setMemberDeptHours] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShifts = async () => {
      const year = new Date().getFullYear()
      const { data: shifts } = await supabase
        .from('shifts')
        .select('member_id, department_id, start_time, end_time, break_minutes')
        .gte('date', `${year}-04-21`)
        .lte('date', `${year}-10-20`)

      const map = {}
      if (shifts) {
        shifts.forEach(s => {
          if (!map[s.member_id]) map[s.member_id] = {}
          const h = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
          map[s.member_id][s.department_id] = (map[s.member_id][s.department_id] ?? 0) + h
        })
      }
      setMemberDeptHours(map)
      setLoading(false)
    }
    fetchShifts()
  }, [])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>研修進捗ダッシュボード</h1>
        <p className={styles.subtitle}>2026年度 上期研修</p>
      </header>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : (
        <div className={styles.memberList}>
          {MEMBERS.map(member => {
            const deptMap = memberDeptHours[member.id] ?? {}
            return (
              <button
                key={member.id}
                className={styles.memberCard}
                onClick={() => navigate(`/admin/member/${member.id}`)}
              >
                <div className={styles.memberHeader}>
                  <p className={styles.memberName}>{member.name}</p>
                  <p className={styles.memberKana}>{member.kana}</p>
                </div>
                <div className={styles.deptRows}>
                  {DEPTS.map(dept => {
                    const h   = deptMap[dept.id] ?? 0
                    const pct = Math.min((h / dept.goal) * 100, 100)
                    return (
                      <div key={dept.id} className={styles.deptRow}>
                        <div className={styles.deptRowHeader}>
                          <span className={styles.deptRowLabel} style={{ color: dept.color }}>
                            {dept.label}
                          </span>
                          <span className={styles.deptRowHours}>
                            {fmtH(h)}<span className={styles.deptRowGoal}>/{dept.goal}h</span>
                          </span>
                        </div>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressBar}
                            style={{ width: `${pct}%`, background: pct >= 100 ? '#10B981' : dept.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <span className={styles.chevron}>›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
