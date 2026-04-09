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
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr))
    } else {
      setSelectedDates([...selectedDates, dateStr])
    }
  }

  const saveStatus = async () => {
    if (!session) return
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
      alert('บันทึกสำเร็จ!')
      setCurrentNote('')
      fetchAvailability()
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const getLocalDateString = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
  const blanks = Array(firstDayOfMonth).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1))

  const groupedData = list.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push({ name: item.name, note: item.note })
    return acc
  }, {})

  if (!mounted) return null
  if (!session) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700 text-white">
          <h1 className="text-2xl font-bold mb-6 text-center">{isSignUp ? '📝 สมัครสมาชิก' : '🔐 เข้าสู่ระบบ'}</h1>
          <form onSubmit={async (e: any) => {
             e.preventDefault();
             const fakeEmail = `${username.trim()}@calendar.app`;
             if (isSignUp) {
               const { error } = await supabase.auth.signUp({ email: fakeEmail, password });
               if (error) alert(error.message); else alert('สำเร็จ!');
             } else {
               const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
               if (error) alert(error.message);
             }
          }} className="space-y-4">
            <input type="text" placeholder="ชื่อผู้ใช้" className="w-full p-3 rounded-lg bg-gray-700 outline-none" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="รหัสผ่าน" className="w-full p-3 rounded-lg bg-gray-700 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold">ยืนยัน</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 mt-4 w-full text-center hover:underline">
            {isSignUp ? 'มีบัญชีแล้ว? ล็อกอิน' : 'ยังไม่มีบัญชี? สมัครใหม่'}
          </button>
        </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-8 font-sans text-white">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header + Note Input */}
        <div className="bg-gray-800/80 p-5 rounded-xl border border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-[10px] sm:text-xs text-gray-400 mb-1 block uppercase tracking-wider">ระบุหมายเหตุ (เช่น ว่างกี่โมง/ไปไหน)</label>
            <input 
              type="text" 
              placeholder="พิมพ์โน้ตตรงนี้ แล้วค่อยไปเลือกวัน..."
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 outline-none text-sm transition-all"
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={saveStatus} className="flex-1 bg-emerald-600 px-6 py-3 rounded-lg font-bold hover:bg-emerald-500 transition-all text-sm shadow-lg shadow-emerald-900/20">
              💾 บันทึก
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-red-400 px-4 py-3 border border-red-500/30 rounded-lg hover:bg-red-900/20 text-sm">ออก</button>
          </div>
        </div>

        {/* Calendar Section - ใช้วิธีที่ 2: Horizontal Scroll */}
        <div className="bg-gray-800/50 p-3 sm:p-6 rounded-2xl border border-gray-700 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-xl p-2 hover:bg-gray-700 rounded-lg text-white">⬅️</button>
            <h2 className="text-lg sm:text-2xl font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-xl p-2 hover:bg-gray-700 rounded-lg text-white">➡️</button>
          </div>

          {/* Wrapper สำหรับเลื่อนข้างในมือถือ */}
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            {/* กำหนด min-width เพื่อไม่ให้ปฏิทินแคบเกินไปในจอมือถือ */}
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-2">
                {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => <div key={d} className="text-center font-bold text-gray-500 pb-2 text-sm uppercase tracking-tighter">{d}</div>)}
                
                {blanks.map((_, i) => <div key={`b-${i}`} className="min-h-[110px] sm:min-h-[140px] bg-gray-900/20 rounded-xl border border-transparent"></div>)}
                
                {days.map((day, i) => {
                  const dateStr = getLocalDateString(day)
                  const isSelected = selectedDates.includes(dateStr)
                  const items = groupedData[dateStr] || []
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => toggleDate(dateStr)}
                      className={`min-h-[110px] sm:min-h-[140px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col ${
                        isSelected 
                          ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' 
                          : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <span className={`text-right font-bold text-xs sm:text-sm mb-1 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>
                        {day.getDate()}
                      </span>
                      
                      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[80px] sm:max-h-[100px] custom-scrollbar pr-0.5">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className={`p-1 sm:p-1.5 rounded border flex flex-col shadow-sm ${
                            item.name === session.user.email.split('@')[0] 
                              ? 'bg-blue-500/30 border-blue-400/50' 
                              : 'bg-gray-700/50 border-gray-600/50'
                          }`}>
                            <span className="text-[9px] sm:text-[11px] font-bold leading-tight truncate">{item.name}</span>
                            {item.note && (
                              <span className="text-[8px] sm:text-[9px] text-gray-400 italic break-words leading-tight mt-0.5 border-t border-gray-600/50 pt-0.5">
                                💬 {item.note}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-4 text-center sm:hidden">↔️ เลื่อนตารางไปทางซ้าย-ขวาเพื่อดูวันอื่นๆ</p>
        </div>
      </div>
    </main>
  )
}