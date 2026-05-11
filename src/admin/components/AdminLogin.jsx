import { useState } from 'react'
import styles from './AdminLogin.module.css'

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuthenticated', 'true')
      onLogin()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>🔐</div>
        <h1 className={styles.title}>管理者ログイン</h1>
        <p className={styles.subtitle}>研修管理システム</p>
      </div>
      <form className={styles.card} onSubmit={handleSubmit}>
        <p className={styles.instruction}>パスワードを入力してください</p>
        <input
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false) }}
          placeholder="パスワード"
          autoFocus
        />
        {error && <p className={styles.errorMsg}>パスワードが正しくありません</p>}
        <button className={styles.button} type="submit">
          ログイン
        </button>
      </form>
    </div>
  )
}
