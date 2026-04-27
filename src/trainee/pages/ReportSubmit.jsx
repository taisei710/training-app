import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS, HOURS_OPTIONS } from '../../lib/constants'
import styles from './ReportSubmit.module.css'

export default function ReportSubmit({ user }) {
  const navigate = useNavigate()
  const [dept, setDept] = useState('')
  const [hours, setHours] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const selectedHours = HOURS_OPTIONS.find((h) => String(h.value) === hours)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!dept || !hours || !content.trim()) {
      setError('すべての項目を入力してください')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const { error: dbError } = await supabase.from('reports').insert({
        member_id: user.id,
        member_name: user.name,
        department_id: dept,
        hours: Number(hours),
        units: selectedHours.units,
        content: content.trim(),
        submitted_at: new Date().toISOString(),
      })
      if (dbError) {
        console.error('Supabase insert error:', dbError)
        setError(`送信に失敗しました（${dbError.code}: ${dbError.message}）`)
        return
      }
      setDone(true)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('送信中に予期せぬエラーが発生しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className={styles.doneContainer}>
        <div className={styles.doneIcon}>✅</div>
        <h2 className={styles.doneTitle}>提出完了！</h2>
        <p className={styles.doneMsg}>
          {DEPARTMENTS.find((d) => d.id === dept)?.name} に<br />
          <strong>{selectedHours?.units}単位</strong> が加算されました
        </p>
        <button className={styles.backBtn} onClick={() => navigate('/trainee')}>
          ホームへ戻る
        </button>
        <button
          className={styles.anotherBtn}
          onClick={() => {
            setDept('')
            setHours('')
            setContent('')
            setDone(false)
          }}
        >
          続けて提出する
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn2} onClick={() => navigate('/trainee')}>
          ‹ 戻る
        </button>
        <h2 className={styles.title}>日報提出</h2>
        <div />
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>部署</label>
          <div className={styles.deptGrid}>
            {DEPARTMENTS.map((d) => (
              <button
                type="button"
                key={d.id}
                className={`${styles.deptBtn} ${dept === d.id ? styles.deptBtnActive : ''}`}
                onClick={() => setDept(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>参加時間</label>
          <div className={styles.hoursGrid}>
            {HOURS_OPTIONS.map((h) => (
              <button
                type="button"
                key={h.value}
                className={`${styles.hoursBtn} ${String(h.value) === hours ? styles.hoursBtnActive : ''}`}
                onClick={() => setHours(String(h.value))}
              >
                <span className={styles.hoursMain}>{h.value}時間</span>
                <span className={styles.hoursSub}>{h.units}単位</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>学んだこと・気づき</label>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今日の研修で学んだことや感じたことを書いてください"
            rows={5}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? '送信中...' : '日報を提出する'}
        </button>
      </form>
    </div>
  )
}
