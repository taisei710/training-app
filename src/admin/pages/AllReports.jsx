import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MEMBERS, DEPARTMENTS } from '../../lib/constants'
import styles from './AllReports.module.css'

const DEPT_MAP = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

export default function AllReports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confirmId, setConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (data) setReports(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered =
    filter === 'all' ? reports : reports.filter((r) => r.member_id === filter)

  const formatDate = (iso) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const executeDelete = async () => {
    if (!confirmId || deleting) return
    setDeleting(true)
    const { error } = await supabase.from('reports').delete().eq('id', confirmId)
    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== confirmId))
    }
    setConfirmId(null)
    setDeleting(false)
  }

  const confirmTarget = reports.find((r) => r.id === confirmId)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin')}>
          ‹ 戻る
        </button>
        <h2 className={styles.title}>全日報一覧</h2>
        <div />
      </header>

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('all')}
        >
          全員
        </button>
        {MEMBERS.map((m) => (
          <button
            key={m.id}
            className={`${styles.filterBtn} ${filter === m.id ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(m.id)}
          >
            {m.name.split('').slice(0, 2).join('')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>日報がありません</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.memberName}>{r.member_name}</span>
                <span className={styles.date}>{formatDate(r.submitted_at)}</span>
              </div>
              <div className={styles.cardMid}>
                <span className={styles.deptTag}>{DEPT_MAP[r.department_id] || r.department_id}</span>
                <span className={styles.units}>+{r.units}単位</span>
              </div>
              <p className={styles.content}>{r.content}</p>
              <div className={styles.cardFooter}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setConfirmId(r.id)}
                >
                  取り消し
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <div className={styles.overlay} onClick={() => setConfirmId(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <p className={styles.dialogTitle}>日報を取り消す</p>
            <p className={styles.dialogMsg}>
              {confirmTarget?.member_name} さんの
              {confirmTarget ? ` ${formatDate(confirmTarget.submitted_at)}` : ''}
              の日報を取り消しますか？{'\n'}
              削除後は元に戻せません。
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.dialogCancelBtn}
                onClick={() => setConfirmId(null)}
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                className={styles.dialogDeleteBtn}
                onClick={executeDelete}
                disabled={deleting}
              >
                {deleting ? '削除中...' : '取り消す'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
