import { useState } from 'react'
import styles from './AdminLogin.module.css'

export default function AdminLogin({ onSelect }) {
  const [screen, setScreen] = useState('select')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleViewMode = () => onSelect('view')

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      onSelect('edit')
    } else {
      setError(true)
      setPassword('')
    }
  }

  const backToSelect = () => {
    setScreen('select')
    setPassword('')
    setError(false)
  }

  if (screen === 'password') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>🔐</div>
          <h1 className={styles.title}>編集モード</h1>
          <p className={styles.subtitle}>パスワードを入力してください</p>
        </div>
        <form className={styles.card} onSubmit={handleEditSubmit}>
          <input
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="パスワード"
            autoFocus
          />
          {error && <p className={styles.errorMsg}>パスワードが正しくありません</p>}
          <button className={styles.editBtn} type="submit">
            ログイン
          </button>
          <button className={styles.backLink} type="button" onClick={backToSelect}>
            ← 戻る
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>📋</div>
        <h1 className={styles.title}>研修管理システム</h1>
        <p className={styles.subtitle}>モードを選択してください</p>
      </div>
      <div className={styles.card}>
        <button className={styles.viewModeBtn} onClick={handleViewMode}>
          <span className={styles.modeIcon}>👁️</span>
          <div className={styles.modeText}>
            <span className={styles.modeLabel}>閲覧のみ</span>
            <span className={styles.modeDesc}>データを閲覧できます（編集不可）</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>
        <button className={styles.editModeBtn} onClick={() => setScreen('password')}>
          <span className={styles.modeIcon}>✏️</span>
          <div className={styles.modeText}>
            <span className={styles.modeLabel}>編集モード</span>
            <span className={styles.modeDesc}>データの編集・保存が可能です</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>
      </div>
    </div>
  )
}
