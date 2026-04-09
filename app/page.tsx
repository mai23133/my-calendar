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

  // --- 1. เช็คสถานะการเข้าสู่ระบบ ---
  useEffect(() => {
    setMounted(true)
    
    // เช็ค Session ครั้งแรกที่เปิดเว็บ
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setName(session.user?.email?.split('@')[0] || '')
        fetchAvailability()
      }
    })

    // ดักฟังเหตุการณ์ Login/Logout เพื่อเปลี่ยนหน้าทันที
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setName(session.user?.email?.split('@')[0] || '')
        fetchAvailability()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // --- 2. ฟังก์ชัน สมัคร/ล็อกอิน (แบบใช้ Username) ---
  const handleAuth = async (e: any) => {
    e.preventDefault()
    // วิชามาร: แปลง username เป็น email ปลอมสำหรับ Supabase
    const fakeEmail = `${username.trim()}@calendar.app`

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password })
      if (error) alert('สมัครไม่สำเร็จ: ' + error.message)
      else alert('สมัครสำเร็จ! ล็อกอินเข้าใช้งานได้เลย')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password })
      if (error) alert('ล็อกอินไม่สำเร็จ: ' + error.message)
      // ถ้าสำเร็จ onAuthStateChange ด้านบนจะพาเข้าหน้าหลักเอง
    }
  }

  // --- 3. ฟังก์ชันดึงข้อมูลฐานข้อมูล ---
  const fetchAvailability = async () => {
    const { data } = await supabase.from('availability').select('*').order('date', { ascending: true })
    if (data) setList(data)
  }

  const getMyExistingDates = () => {
    if (!session) return []
    return list
      .filter(item => item.user_id === session.user.id)
      .map(item => item.date)
  }

  // อัปเดตวันที่เราเลือก เมื่อข้อมูลจาก DB เปลี่ยน (เพื่อให้สีฟ้าขึ้นในวันที่มีชื่อเรา)
  useEffect(() => {
    if (session) {
      setSelectedDates(getMyExistingDates())
    }
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
          user_id: userId
        }))
        await supabase.from('availability').insert(insertData)
      }
      alert('บันทึกข้อมูลเรียบร้อย!')
      fetchAvailability()
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเซฟ')
    }
  }

  // ระบบแสดงผลปฏิทิน
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
    acc[item.date].push(item.name)
    return acc
  }, {})

  if (!mounted) return null

  // --- แสดงหน้า Login ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            {isSignUp ? '📝 สมัครสมาชิก' : '🔐 เข้าสู่ระบบ'}
          </h1>
          <form onSubmit={handleAuth} className="space-y-4 text-white">
            <input 
              type="text" 
              placeholder="ชื่อผู้ใช้ (ภาษาอังกฤษ)" 
              className="w-full p-3 rounded-lg bg-gray-700 outline-none border border-gray-600 focus:border-blue-500" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="รหัสผ่าน" 
              className="w-full p-3 rounded-lg bg-gray-700 outline-none border border-gray-600 focus:border-blue-500" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-colors">
              ยืนยัน
            </button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 mt-4 w-full text-center hover:underline">
            {isSignUp ? 'มีบัญชีแล้ว? ล็อกอินเข้าใช้งาน' : 'ยังไม่มีบัญชี? สมัครใหม่ที่นี่'}
          </button>
        </div>
      </div>
    )
  }

  // --- แสดงหน้าปฏิทิน (Dashboard) ---
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-8 font-sans text-white">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-gray-800/80 p-4 rounded-xl border border-gray-700 gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm">👤 บัญชี: <strong className="text-blue-400">{session.user.email.split('@')[0]}</strong></span>
          </div>
          <div className="flex gap-2">
            <button onClick={saveStatus} className="bg-emerald-600 px-6 py-2 rounded-lg font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
              💾 บันทึกการเปลี่ยนแปลง
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-red-400 px-4 py-2 border border-red-500/30 rounded-lg hover:bg-red-900/20 transition-all">
              ออกจากระบบ
            </button>
          </div>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-2xl p-2 hover:bg-gray-700 rounded-lg">⬅️</button>
            <h2 className="text-2xl font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-2xl p-2 hover:bg-gray-700 rounded-lg">➡️</button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => <div key={d} className="text-center font-bold text-gray-500 pb-2">{d}</div>)}
            {blanks.map((_, i) => <div key={`b-${i}`} className="min-h-[120px] bg-gray-900/20 rounded-xl"></div>)}
            {days.map((day, i) => {
              const dateStr = getLocalDateString(day)
              const isSelected = selectedDates.includes(dateStr)
              const people = groupedData[dateStr] || []
              
              return (
                <div 
                  key={i} 
                  onClick={() => toggleDate(dateStr)}
                  className={`min-h-[120px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col relative ${
                    isSelected ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <span className={`text-right font-bold ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>{day.getDate()}</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {people.map((p: any, idx: number) => (
                      <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded border truncate max-w-full ${
                        p === session.user.email.split('@')[0] ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-gray-700 border-gray-600 text-gray-300'
                      }`}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}