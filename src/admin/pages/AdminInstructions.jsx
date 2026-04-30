import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { MEMBERS, DEPARTMENTS } from '../../lib/constants'
import styles from './AdminInstructions.module.css'

function fmtDate(ds) {
  if (!ds) return '—'
  const d = new Date(ds + 'T00:00:00')
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`
}

const EMPTY_FORM = {
  member_id: '', department_id: '', date: '', instructor: '',
  location: '', nearest_station: '', start_time: '', end_time: '',
  dress_code: '', items_to_bring: '', notes: '',
}

export default function AdminInstructions() {
  const [instructions, setInstructions] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const [{ data: iData }, { data: rData }] = await Promise.all([
      supabase.from('training_instructions').select('*').order('date', { ascending: false }),
      supabase.from('training_reports').select('instruction_id'),
    ])
    if (iData) setInstructions(iData)
    if (rData) setReports(rData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const hasReport = (id) => reports.some(r => r.instruction_id === id)
  const getMemberName = (id) => MEMBERS.find(m => m.id === id)?.name ?? id
  const getDeptName = (id) => DEPARTMENTS.find(d => d.id === id)?.name ?? id

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (inst) => {
    setEditId(inst.id)
    setForm({
      member_id:       inst.member_id,
      department_id:   inst.department_id,
      date:            inst.date            ?? '',
      instructor:      inst.instructor      ?? '',
      location:        inst.location        ?? '',
      nearest_station: inst.nearest_station ?? '',
      start_time:      inst.start_time      ?? '',
      end_time:        inst.end_time        ?? '',
      dress_code:      inst.dress_code      ?? '',
      items_to_bring:  inst.items_to_bring  ?? '',
      notes:           inst.notes           ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (saving || !form.member_id || !form.department_id || !form.date) return
    setSaving(true)
    const payload = {
      member_id:       form.member_id,
      department_id:   form.department_id,
      date:            form.date,
      instructor:      form.instructor      || null,
      location:        form.location        || null,
      nearest_station: form.nearest_station || null,
      start_time:      form.start_time      || null,
      end_time:        form.end_time        || null,
      dress_code:      form.dress_code      || null,
      items_to_bring:  form.items_to_bring  || null,
      notes:           form.notes           || null,
    }
    if (editId) {
      await supabase.from('training_instructions').update(payload).eq('id', editId)
    } else {
      await supabase.from('training_instructions').insert(payload)
    }
    await load()
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (deleting || !deleteTarget) return
    setDeleting(true)
    await supabase.from('training_instructions').delete().eq('id', deleteTarget.id)
    await load()
    setDeleteTarget(null)
    setDeleting(false)
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>研修指示書</h2>
      </header>

      <div className={styles.actionBar}>
        <button className={styles.createBtn} onClick={openCreate}>＋ 新規作成</button>
      </div>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : instructions.length === 0 ? (
        <p className={styles.noRecords}>指示書がありません</p>
      ) : (
        <div className={styles.list}>
          {instructions.map(inst => (
            <div key={inst.id} className={styles.item}>
              <div className={styles.itemMain}>
                <div className={styles.itemTop}>
                  <span className={styles.itemDate}>{fmtDate(inst.date)}</span>
                  <span className={hasReport(inst.id) ? styles.badgeSubmitted : styles.badgePending}>
                    {hasReport(inst.id) ? '提出済み' : '未提出'}
                  </span>
                </div>
                <p className={styles.itemMember}>{getMemberName(inst.member_id)}</p>
                <p className={styles.itemDept}>{getDeptName(inst.department_id)}</p>
                {inst.instructor && <p className={styles.itemInstructor}>担当：{inst.instructor}</p>}
              </div>
              <div className={styles.itemActions}>
                <button className={styles.editBtn} onClick={() => openEdit(inst)}>編集</button>
                <button className={styles.deleteBtn} onClick={() => setDeleteTarget(inst)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editId ? '指示書を編集' : '指示書を新規作成'}</span>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className={styles.scrollArea}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>研修生 *</label>
                <select className={styles.input} value={form.member_id} onChange={f('member_id')}>
                  <option value="">選択してください</option>
                  {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>研修部署 *</label>
                <select className={styles.input} value={form.department_id} onChange={f('department_id')}>
                  <option value="">選択してください</option>
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>日付 *</label>
                <input type="date" className={styles.input} value={form.date} onChange={f('date')} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>担当者名</label>
                <input type="text" className={styles.input} value={form.instructor} onChange={f('instructor')} placeholder="例: 山田太郎" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>研修場所</label>
                <input type="text" className={styles.input} value={form.location} onChange={f('location')} placeholder="例: 本社2F会議室" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>最寄り駅</label>
                <input type="text" className={styles.input} value={form.nearest_station} onChange={f('nearest_station')} placeholder="例: ○○駅 徒歩5分" />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>開始時刻</label>
                  <input type="time" className={styles.input} value={form.start_time} onChange={f('start_time')} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>終了時刻</label>
                  <input type="time" className={styles.input} value={form.end_time} onChange={f('end_time')} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>服装</label>
                <input type="text" className={styles.input} value={form.dress_code} onChange={f('dress_code')} placeholder="例: スーツ着用" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>持ち物</label>
                <input type="text" className={styles.input} value={form.items_to_bring} onChange={f('items_to_bring')} placeholder="例: 筆記用具、ノート" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>備考</label>
                <textarea className={`${styles.input} ${styles.textarea}`} value={form.notes} onChange={f('notes')} placeholder="その他の注意事項など" rows={3} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)} disabled={saving}>キャンセル</button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !form.member_id || !form.department_id || !form.date}
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <p className={styles.dialogTitle}>指示書を削除しますか？</p>
            <p className={styles.dialogMsg}>
              {getMemberName(deleteTarget.member_id)}　{fmtDate(deleteTarget.date)}
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</button>
              <button className={styles.dangerBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
