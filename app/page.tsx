'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const [name, setName] = useState('')
  const [list, setList] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [currentNote, setCurrentNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setName(session.user?.email?.split('@')[0] || '')
        fetchAvailability()
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setName(session.user?.email?.split('@')[0] || '')
        fetchAvailability()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchAvailability = async () => {
    const { data } = await supabase.from('availability').select('*').order('date', { ascending: true })
    if (data) setList(data)
  }

  const getMyExistingDates = () => {
    if (!session) return []
    return list.filter(item => item.user_id === session.user.id).map(item => item.date)
  }

  useEffect(() => {
    if (session) setSelectedDates(getMyExistingDates())
  }, [list, session])

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    )
  }

  const saveStatus = async () => {
    if (!session) return
    setSaving(true)
    const userId = session.user.id
    const myExistingDates = getMyExistingDates()
    const datesToAdd = selectedDates.filter(d => !myExistingDates.includes(d))
    const datesToRemove = myExistingDates.filter(d => !selectedDates.includes(d))
    try {
      if (datesToRemove.length > 0) {
        await supabase.from('availability').delete().match({ user_id: userId }).in('date', datesToRemove)
      }
      if (datesToAdd.length > 0) {
        const insertData = datesToAdd.map(d => ({
          name: name.trim() || session.user.email.split('@')[0],
          date: d,
          status: 'ว่าง',
          user_id: userId,
          note: currentNote
        }))
        await supabase.from('availability').insert(insertData)
      }
      setCurrentNote('')
      fetchAvailability()
    } catch {
      alert('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const getLocalDateString = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().split('T')[0]
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]
  const dayHeaders = ['อา','จ','อ','พ','พฤ','ศ','ส']
  const blanks = Array(firstDayOfMonth).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1))

  const groupedData = list.reduce<Record<string, { name: string; note: string }[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push({ name: item.name, note: item.note })
    return acc
  }, {})

  // --- Logic สำหรับจัดอันดับ "วันที่คนว่างเยอะสุด" ---
  const sortedBestDates = Object.entries(groupedData)
    .map(([dateStr, people]) => ({
      date: dateStr,
      count: people.length,
      names: people.map(p => p.name).join(', ')
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count; // เรียงตามจำนวนคนว่าง
      return new Date(a.date).getTime() - new Date(b.date).getTime(); // ถ้าคนเท่ากัน เรียงตามวันที่มาก่อน
    })

  // ฟังก์ชันช่วยแปลงวันที่ให้สวยงาม
  const formatDateThai = (dateString: string) => {
    const d = new Date(dateString)
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`
  }

  // ── shared styles ─────────────────────────────────────
  const S = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#080c14' ,
      fontFamily: "'DM Sans', 'Noto Sans Thai', sans-serif",
      color: '#f0f4ff',
      padding: '1.5rem 1rem',
    } as React.CSSProperties,
    surface: {
      background: '#0d1420',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      color: '#f0f4ff',
      fontFamily: "'DM Sans', 'Noto Sans Thai', sans-serif",
      fontSize: '0.875rem',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    btnPrimary: {
      width: '100%',
      padding: '0.8125rem',
      background: '#6d4dff',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
      letterSpacing: '0.01em',
    } as React.CSSProperties,
  }

  if (!mounted) return null

  // ── Login ──────────────────────────────────────────────
  if (!session) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(109,77,255,0.13) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%', zIndex: 0 }} />

      <div style={{ ...S.surface, padding: '2.5rem', width: '100%', maxWidth: 400, position: 'relative', overflow: 'hidden', zIndex: 1, boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(109,77,255,0.8), transparent)' }} />

        <div style={{ width: 44, height: 44, background: 'rgba(109,77,255,0.12)', border: '1px solid rgba(109,77,255,0.35)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '1.25rem' }}>📅</div>

        <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f0f4ff', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
          {isSignUp ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับ'}
        </div>
        <div style={{ color: '#8892a4', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
          {isSignUp ? 'กรอกข้อมูลเพื่อเริ่มใช้งาน' : 'เข้าสู่ระบบเพื่อดูปฏิทินทีม'}
        </div>
        <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg, #6d4dff, transparent)', borderRadius: 99, marginBottom: '1.5rem' }} />

        <form onSubmit={async (e: any) => {
          e.preventDefault()
          const fakeEmail = `${username.trim()}@calendar.app`
          if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email: fakeEmail, password })
            if (error) alert(error.message); else alert('สมัครสำเร็จ!')
          } else {
            const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password })
            if (error) alert(error.message)
          }
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: '0.375rem' }}>ชื่อผู้ใช้</div>
              <input style={S.input} type="text" placeholder="กรอกชื่อผู้ใช้..." value={username} onChange={e => setUsername(e.target.value)} required
                onFocus={e => { e.target.style.borderColor = '#6d4dff'; e.target.style.boxShadow = '0 0 0 3px rgba(109,77,255,0.15)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: '0.375rem' }}>รหัสผ่าน</div>
              <input style={S.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                onFocus={e => { e.target.style.borderColor = '#6d4dff'; e.target.style.boxShadow = '0 0 0 3px rgba(109,77,255,0.15)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
            </div>
          </div>
          <button type="submit" style={S.btnPrimary}>
            {isSignUp ? 'สร้างบัญชี →' : 'เข้าสู่ระบบ →'}
          </button>
        </form>

        <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#8b6dff', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.875rem 0 0', width: '100%', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          {isSignUp ? '← มีบัญชีแล้ว? ล็อกอิน' : 'ยังไม่มีบัญชี? สมัครใหม่ →'}
        </button>
      </div>
    </div>
  )

  // ── Main App ───────────────────────────────────────────
  // ป้องกันเว็บพังด้วยการใส่ ? ก่อน .email
  const myUsername = session.user?.email?.split('@')[0] || ''

  return (
    <div style={{ ...S.page, backgroundImage: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(109,77,255,0.09) 0%, transparent 55%), linear-gradient(rgba(255,255,255,0.011) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.011) 1px, transparent 1px)', backgroundSize: '100% 100%, 44px 44px, 44px 44px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── Topbar ── */}
        <div style={{ ...S.surface, padding: '0.875rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(109,77,255,0.12)', border: '1px solid rgba(109,77,255,0.3)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📅</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Team Calendar</div>
              <div style={{ fontSize: '0.75rem', color: '#8892a4' }}>สวัสดี, <strong style={{ color: '#c4b5fd' }}>{name}</strong></div>
            </div>
          </div>

          <input
            type="text"
            value={currentNote}
            onChange={e => setCurrentNote(e.target.value)}
            placeholder="📝  โน้ตสำหรับวันที่จะเลือก เช่น ว่างช่วงเช้า / อยู่ที่ออฟฟิศ..."
            style={{ ...S.input, flex: 1, minWidth: 160 }}
            onFocus={e => { e.target.style.borderColor = '#6d4dff'; e.target.style.boxShadow = '0 0 0 3px rgba(109,77,255,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button onClick={saveStatus} disabled={saving} style={{ padding: '0.6875rem 1.125rem', background: saving ? '#065f46' : '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.8125rem', cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? '⏳...' : '💾 บันทึก'}
            </button>
            <button onClick={() => supabase.auth.signOut()} style={{ padding: '0.6875rem 0.875rem', background: 'transparent', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 10, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              ออก
            </button>
          </div>
        </div>

        {/* ── Calendar ── */}
        <div style={{ ...S.surface, padding: '1.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              style={{ width: 36, height: 36, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#8892a4', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>

            <div style={{ fontSize: 'clamp(1rem, 3vw, 1.375rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {monthNames[currentMonth.getMonth()]}&nbsp;
              <span style={{ color: '#a78bfa' }}>{currentMonth.getFullYear() + 543}</span>
            </div>

            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              style={{ width: 36, height: 36, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#8892a4', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          </div>

          {/* Grid */}
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ minWidth: 660 }}>
              {/* Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 5 }}>
                {dayHeaders.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#374151', padding: '0.375rem 0' }}>{d}</div>
                ))}
              </div>

              {/* Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                {blanks.map((_, i) => (
                  <div key={`b-${i}`} style={{ minHeight: 115, borderRadius: 9, border: '1px dashed rgba(255,255,255,0.03)', background: 'transparent' }} />
                ))}

                {days.map((day, i) => {
                  const dateStr = getLocalDateString(day)
                  const isSelected = selectedDates.includes(dateStr)
                  const items = groupedData[dateStr] || []

                  return (
                    <div key={i} onClick={() => toggleDate(dateStr)} style={{
                      minHeight: 115,
                      padding: '0.4rem 0.45rem',
                      borderRadius: 9,
                      border: isSelected ? '1px solid #6d4dff' : '1px solid rgba(255,255,255,0.06)',
                      background: isSelected ? 'rgba(109,77,255,0.08)' : '#0f1724',
                      boxShadow: isSelected ? '0 0 0 1px #6d4dff, 0 4px 18px rgba(109,77,255,0.14)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                      {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6d4dff, #a78bfa)' }} />}

                      <span style={{ textAlign: 'right', fontSize: '0.6875rem', fontWeight: 700, color: isSelected ? '#a78bfa' : '#374151', marginBottom: 4, lineHeight: 1 }}>
                        {day.getDate()}
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1, maxHeight: 80 }}>
                        {items.map((item: any, idx: number) => {
                          const isMe = item.name === myUsername
                          return (
                            <div key={idx} style={{ padding: '2px 5px', borderRadius: 4, background: isMe ? 'rgba(109,77,255,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isMe ? 'rgba(109,77,255,0.38)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: isMe ? '#c4b5fd' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                              {item.note && <div style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic', marginTop: 1, wordBreak: 'break-word', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 1 }}>💬 {item.note}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#1f2937', marginTop: '0.875rem' }}>
            ↔ เลื่อนซ้าย-ขวาเพื่อดูวันอื่น (มือถือ)
          </div>
        </div>

        {/* ── Summary Table (ไอเดียที่ 1: วันที่คนว่างตรงกันเยอะสุด) ── */}
        {sortedBestDates.length > 0 && (
          <div style={{ ...S.surface, padding: '1.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.25rem' }}>🏆</div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#f0f4ff', letterSpacing: '-0.01em' }}>สรุปวันที่คนว่างตรงกันเยอะที่สุด</h2>
            </div>
            
            <div style={{ background: '#111827', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>วันที่</div>
                <div>จำนวนคนว่าง</div>
                <div>รายชื่อ</div>
              </div>
              
              {/* Table Body (โชว์สูงสุด 5 อันดับแรก) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sortedBestDates.slice(0, 5).map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr', padding: '0.875rem 1rem', borderBottom: idx === Math.min(sortedBestDates.length, 5) - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)', alignItems: 'center', transition: 'background 0.2s', cursor: 'default' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>
                      {formatDateThai(item.date)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      🌟 {item.count} คน
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.names}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {sortedBestDates.length > 5 && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>
                แสดงผลเฉพาะ 5 อันดับแรกที่มีคนว่างมากที่สุด
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}