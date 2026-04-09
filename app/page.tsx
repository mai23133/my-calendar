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

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setName(session.user.email.split('@')[0])
        fetchAvailability()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setName(session.user.email.split('@')[0])
        fetchAvailability()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchAvailability = async () => {
    const { data } = await supabase.from('availability').select('*').order('date', { ascending: true })
    if (data) setList(data)
  }

  // --- ฟังชันก์ใหม่: ตรวจสอบว่าเราเคยลงวันนั้นไว้หรือยัง ---
  const getMyExistingDates = () => {
    if (!session) return []
    return list
      .filter(item => item.user_id === session.user.id)
      .map(item => item.date)
  }

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr))
    } else {
      setSelectedDates([...selectedDates, dateStr])
    }
  }

  // --- ฟังก์ชันบันทึกแบบ Sync (เพิ่ม/ลบ ตามสถานะที่เลือก) ---
  const saveStatus = async () => {
    if (!session) return
    const userId = session.user.id
    const myExistingDates = getMyExistingDates()

    // 1. หาว่าวันที่เลือกใหม่ อันไหนที่ยังไม่มีใน DB -> สั่ง INSERT
    const datesToAdd = selectedDates.filter(d => !myExistingDates.includes(d))
    
    // 2. หาว่าวันที่เคยมีใน DB แต่อันไหนที่ไม่ได้ถูกเลือกแล้ว -> สั่ง DELETE
    const datesToRemove = myExistingDates.filter(d => !selectedDates.includes(d))

    try {
      // ดำเนินการลบ
      if (datesToRemove.length > 0) {
        await supabase
          .from('availability')
          .delete()
          .match({ user_id: userId })
          .in('date', datesToRemove)
      }

      // ดำเนินการเพิ่ม
      if (datesToAdd.length > 0) {
        const insertData = datesToAdd.map(d => ({
          name: name.trim() || session.user.email.split('@')[0],
          date: d,
          status: 'ว่าง',
          user_id: userId
        }))
        await supabase.from('availability').insert(insertData)
      }

      alert('อัปเดตข้อมูลสำเร็จ!')
      fetchAvailability()
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  // เมื่อข้อมูล list (จาก DB) เปลี่ยน ให้เราอัปเดต selectedDates ของเราด้วย
  useEffect(() => {
    const myDates = getMyExistingDates()
    setSelectedDates(myDates)
  }, [list])

  // --- ระบบปฏิทิน (เหมือนเดิม) ---
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
  if (!session) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* ... โค้ดหน้า Login เหมือนเดิม ... */}
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            {isSignUp ? '📝 สมัครสมาชิก' : '🔐 เข้าสู่ระบบ'}
          </h1>
          <form onSubmit={handleAuth} className="space-y-4 text-white">
            <input type="text" placeholder="ชื่อผู้ใช้" className="w-full p-3 rounded-lg bg-gray-700" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="รหัสผ่าน" className="w-full p-3 rounded-lg bg-gray-700" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold">ยืนยัน</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 mt-4 w-full text-center">
            {isSignUp ? 'มีบัญชีแล้ว? ล็อกอิน' : 'ยังไม่มีบัญชี? สมัครใหม่'}
          </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-8 font-sans text-white">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-gray-800/80 p-4 rounded-xl border border-gray-700 gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm">👤 บัญชี: <strong className="text-blue-400">{session.user.email.split('@')[0]}</strong></span>
          </div>
          <div className="flex gap-2">
            <button onClick={saveStatus} className="bg-emerald-600 px-6 py-2 rounded-lg font-bold hover:bg-emerald-500 transition-all">
              💾 บันทึกการเปลี่ยนแปลง
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-red-400 px-4 py-2 border border-red-500/30 rounded-lg">ออก</button>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-2xl">⬅️</button>
            <h2 className="text-2xl font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-2xl">➡️</button>
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
                  className={`min-h-[120px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col ${
                    isSelected ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <span className={`text-right font-bold ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>{day.getDate()}</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {people.map((p: any, idx: number) => (
                      <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded border ${
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

// ฟังก์ชันจำลองการ Auth (อย่าลืมใส่ในโค้ดคุณ)
async function handleAuth(e: any) { /* เหมือนโค้ดเดิมของคุณ */ }