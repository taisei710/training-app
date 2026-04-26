import { MEMBERS } from '../../lib/constants'
import styles from './Login.module.css'

export default function Login({ onLogin }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>📋</div>
        <h1 className={styles.title}>研修進捗管理</h1>
        <p className={styles.subtitle}>2026年度 上期研修</p>
      </div>
      <div className={styles.card}>
        <p className={styles.instruction}>名前を選んでください</p>
        <div className={styles.memberList}>
          {MEMBERS.map((member) => (
            <button
              key={member.id}
              className={styles.memberButton}
              onClick={() => onLogin(member)}
            >
              <span className={styles.memberName}>{member.name}</span>
              <span className={styles.memberKana}>{member.kana}</span>
              <span className={styles.arrow}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
