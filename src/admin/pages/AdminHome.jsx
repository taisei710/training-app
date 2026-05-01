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
  const [memberDeptHours, setMemberDeptHours]               = useState({})
  const [memberDeptCompletedHours, setMemberDeptCompletedHours] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShifts = async () => {
      const year = new Date().getFullYear()
      const { data: shifts } = await supabase
        .from('shifts')
        .select('id, member_id, department_id, start_time, end_time, break_minutes')
        .gte('date', `${year}-04-21`)
        .lte('date', `${year}-10-20`)

      const scheduledMap = {}
      const completedMap = {}

      if (shifts?.length) {
        shifts.forEach(s => {
          if (!scheduledMap[s.member_id]) scheduledMap[s.member_id] = {}
          const h = calcHours(s.start_time, s.end_time, s.break_minutes ?? 0)
          scheduledMap[s.member_id][s.department_id] = (scheduledMap[s.member_id][s.department_id] ?? 0) + h
        })

        const { data: insts } = await supabase
          .from('training_instructions')
          .select('id, shift_id')
          .in('shift_id', shifts.map(s => s.id))

        if (insts?.length) {
          const { data: reports } = await supabase
            .from('training_reports')
            .select('instruction_id, member_id')
            .in('instruction_id', insts.map(i => i.id))

          if (reports?.length) {
            const instToShift = {}
            insts.forEach(i => { instToShift[i.id] = i.shift_id })
            const shiftMap = {}
            shifts.forEach(s => { shiftMap[s.id] = s })

            reports.forEach(r => {
              const shift = shiftMap[instToShift[r.instruction_id]]
              if (shift) {
                if (!completedMap[r.member_id]) completedMap[r.member_id] = {}
                const h = calcHours(shift.start_time, shift.end_time, shift.break_minutes ?? 0)
                completedMap[r.member_id][shift.department_id] = (completedMap[r.member_id][shift.department_id] ?? 0) + h
              }
            })
          }
        }
      }

      setMemberDeptHours(scheduledMap)
      setMemberDeptCompletedHours(completedMap)
      setLoading(false)
    }
    fetchShifts()
  }, [])

  const summary = (() => {
    if (loading) return null
    const n = MEMBERS.length

    const deptTotals = {}
    const deptCompletedTotals = {}
    DEPTS.forEach(d => { deptTotals[d.id] = 0; deptCompletedTotals[d.id] = 0 })
    MEMBERS.forEach(m => {
      const dm = memberDeptHours[m.id] ?? {}
      const cm = memberDeptCompletedHours[m.id] ?? {}
      DEPTS.forEach(d => {
        deptTotals[d.id]          += dm[d.id] ?? 0
        deptCompletedTotals[d.id] += cm[d.id] ?? 0
      })
    })

    let totalPct = 0
    MEMBERS.forEach(m => {
      const dm = memberDeptHours[m.id] ?? {}
      DEPTS.forEach(d => { totalPct += Math.min((dm[d.id] ?? 0) / d.goal, 1) })
    })
    const avgPct = Math.round((totalPct / (n * DEPTS.length)) * 100)

    const memberAvgs = MEMBERS.map(m => {
      const dm  = memberDeptHours[m.id] ?? {}
      const avg = DEPTS.reduce((s, d) => s + Math.min((dm[d.id] ?? 0) / d.goal, 1), 0) / DEPTS.length
      return { member: m, pct: Math.round(avg * 100) }
    })
    const topMember    = memberAvgs.reduce((a, b) => b.pct > a.pct ? b : a)
    const bottomMember = memberAvgs.reduce((a, b) => b.pct < a.pct ? b : a)

    return { deptTotals, deptCompletedTotals, avgPct, topMember, bottomMember }
  })()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>研修進捗ダッシュボード</h1>
        <p className={styles.subtitle}>2026年度 上期研修</p>
      </header>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : (
        <>
          <section className={styles.summarySection}>
            <p className={styles.summaryTitle}>全体進捗</p>
            <div className={styles.deptSummaryCards}>
              {DEPTS.map(dept => {
                const total     = summary.deptTotals[dept.id]
                const completed = summary.deptCompletedTotals[dept.id]
                const maxH      = dept.goal * MEMBERS.length
                const pct       = Math.min((total / maxH) * 100, 100)
                return (
                  <div key={dept.id} className={styles.deptSummaryCard}>
                    <div className={styles.deptSummaryHeader}>
                      <span className={styles.deptSummaryLabel} style={{ color: dept.color }}>{dept.label}</span>
                      <div className={styles.deptSummaryMeta}>
                        <span className={styles.deptSummaryHours}>
                          予定 {fmtH(total)}<span className={styles.deptSummaryGoal}>/{maxH}h</span>
                        </span>
                        <span className={styles.deptSummaryComp}>進捗 {fmtH(completed)}h</span>
                      </div>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${pct}%`, background: pct >= 100 ? '#10B981' : dept.color }}
                      />
                    </div>
                    <p className={styles.deptSummaryPct}>{Math.round(pct)}%</p>
                  </div>
                )
              })}
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statNum}>{summary.avgPct}%</span>
                <span className={styles.statLabel}>平均進捗</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNum}>{summary.topMember.pct}%</span>
                <span className={styles.statLabel}>最高進捗</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNum}>{summary.bottomMember.pct}%</span>
                <span className={styles.statLabel}>最低進捗</span>
              </div>
            </div>
          </section>

          <p className={styles.memberListTitle}>メンバー別進捗</p>
          <div className={styles.memberList}>
            {MEMBERS.map(member => {
              const deptMap      = memberDeptHours[member.id] ?? {}
              const completedMap = memberDeptCompletedHours[member.id] ?? {}
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
                      const ch  = completedMap[dept.id] ?? 0
                      const pct = Math.min((h / dept.goal) * 100, 100)
                      return (
                        <div key={dept.id} className={styles.deptRow}>
                          <div className={styles.deptRowHeader}>
                            <span className={styles.deptRowLabel} style={{ color: dept.color }}>
                              {dept.label}
                            </span>
                            <div className={styles.deptRowMeta}>
                              <span className={styles.deptRowSched}>
                                予定 {fmtH(h)}/{dept.goal}h
                              </span>
                              <span className={styles.deptRowComp}>
                                進捗 {fmtH(ch)}h
                              </span>
                            </div>
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
        </>
      )}
    </div>
  )
}
