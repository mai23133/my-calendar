'use client'
import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { supabase } from './supabase'

export default function Home() {
  // --- 1. State สำหรับระบบล็อกอิน ---
  const [session, setSession] = useState<any>(null)
  // เปลี่ยนจาก email เป็น username
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // --- 2. State สำหรับปฏิทินและข้อมูล ---
  const [date, setDate] = useState<any>(new Date())
  const [name, setName] = useState('') // กลับมาใช้ State เก็บชื่ออิสระ
  const [list, setList] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  // เช็กสถานะ Login ตอนเปิดเว็บ
 // เช็กสถานะ Login ตอนเปิดเว็บ
  useEffect(() => {
    setMounted(true)
    
    // 1. เช็กตอนโหลดหน้าเว็บครั้งแรก
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        // เติม ?. เพื่อป้องกัน Error ถ้า email ไม่มีค่า
        setName(session.user?.email?.split('@')[0] || '')
        fetchAvailability()
      }
    })

    // 2. ดักจับเวลาเปลี่ยนสถานะ (เช่น ตอนกดล็อกอินสำเร็จ)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setName(session.user?.email?.split('@')[0] || '')
        fetchAvailability()
      }
    })

    // ต้องอยู่ใน useEffect และมี [] ปิดท้ายแบบนี้ครับ
    return () => subscription.unsubscribe()
  }, [])
  // ฟังก์ชัน สมัคร/เข้าสู่ระบบ
  const handleAuth = async (e: any) => {
    e.preventDefault()
    
    // 🔥 วิชามาร: แอบเติม @calendar.app ต่อท้ายชื่อที่เพื่อนพิมพ์
    const fakeEmail = `${username.trim()}@calendar.app`

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password })
      if (error) alert('สมัครไม่สำเร็จ: ' + error.message)
      else alert('สมัครสำเร็จ! ล็อกอินได้เลย')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password })
      if (error) alert('ล็อกอินไม่สำเร็จ: ' + error.message)
    }
  }

  // ฟังก์ชัน ออกจากระบบ
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ดึงข้อมูลรายชื่อทั้งหมด
  const fetchAvailability = async () => {
    const { data } = await supabase.from('availability').select('*').order('date', { ascending: true })
    if (data) setList(data)
  }

  // ฟังก์ชัน บันทึกวันว่างลงฐานข้อมูล
  const saveStatus = async () => {
    if (!name.trim()) return alert('กรุณาพิมพ์ชื่อด้วยนะ!')
    
    // ชดเชยโซนเวลาให้ตรงกับเครื่องที่ใช้งาน
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    const selectedDate = localDate.toISOString().split('T')[0];
    
    const { error } = await supabase.from('availability').insert([
      { 
        name: name.trim(), // ใช้ชื่อที่เพื่อนพิมพ์เอง!
        date: selectedDate, 
        status: 'ว่าง',
        user_id: session.user.id // แอบส่งรหัสบัญชีคนล็อกอินไปเป็นหลักฐาน
      }
    ])
    
    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      alert('บันทึกสำเร็จ!')
      // บันทึกเสร็จ ก็คืนค่าชื่อกลับเป็นชื่อตั้งต้น เผื่อลงวันอื่นต่อ
      setName(session.user.email.split('@')[0]) 
      fetchAvailability()
    }
  }

  // จัดกลุ่มข้อมูลโชว์ใน Dashboard
  const groupedData = list.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item.name)
    return acc
  }, {})

  if (!mounted) return null

  // ==========================================
  // ส่วนที่ 1: หน้าต่าง Login
  // ==========================================
  if (!session) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            {isSignUp ? '📝 สมัครสมาชิก' : '🔐 เข้าสู่ระบบ'}
          </h1>
          <form onSubmit={handleAuth} className="space-y-4">
           <input
              type="text" // เปลี่ยนจาก email เป็น text
              placeholder="ตั้งชื่อผู้ใช้ (ภาษาอังกฤษ/ตัวเลข)"
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none"
              value={username} // เปลี่ยนค่า value เป็น username
              onChange={(e) => setUsername(e.target.value)} // เปลี่ยนตอนอัปเดตค่า
              required
            />
            <input
              type="password"
              placeholder="รหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)"
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">
              {isSignUp ? 'ยืนยันการสมัคร' : 'ล็อกอินเข้าใช้งาน'}
            </button>
          </form>
          <p className="text-gray-400 text-center mt-4 text-sm">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 hover:underline font-bold">
              {isSignUp ? 'มีบัญชีอยู่แล้ว? ล็อกอินเลย' : 'ยังไม่มีบัญชีใช่ไหม? สมัครสมาชิก'}
            </button>
          </p>
        </div>
      </main>
    )
  }

  // ==========================================
  // ส่วนที่ 2: หน้า Dashboard (หลังล็อกอิน)
  // ==========================================
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 flex flex-col items-center font-sans">
      <div className="max-w-4xl w-full">
        
        {/* แถบ Header: บอกบัญชีที่ล็อกอินอยู่ (แต่ไม่บังคับใช้ชื่อนี้) */}
        <div className="flex justify-between items-center mb-8 bg-gray-800/80 p-4 rounded-xl border border-gray-700 shadow-sm">
          <span className="text-white text-sm sm:text-base">👤 บัญชี: <strong className="text-blue-400">{session.user.email}</strong></span>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-sm border border-red-500/30 px-4 py-2 rounded-lg transition-all">
            ออกจากระบบ
          </button>
        </div>

        <h1 className="text-3xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          📅 ปฏิทินเช็กวันว่าง
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* ---- ฝั่งซ้าย: โซนเลือกวัน ---- */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-xl text-black w-full mb-4">
              <Calendar onChange={setDate} value={date} locale="th-TH" className="border-none w-full font-medium" />
            </div>
            
            {/* กล่องลงชื่อ (ปลดล็อกให้พิมพ์ชื่อเองได้แล้ว) */}
            <div className="flex w-full gap-2">
              <input
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-blue-500 outline-none transition-all font-bold"
                placeholder="พิมพ์ชื่อที่ต้องการลง..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button onClick={saveStatus} className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-500 font-bold transition-all">
                ลงชื่อ
              </button>
            </div>
          </div>

          {/* ---- ฝั่งขวา: โซน Dashboard สรุปผล ---- */}
          <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 shadow-xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              📊 สรุปวันนัดหมาย
            </h2>
            <div className="space-y-4">
              {Object.keys(groupedData).length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic bg-gray-900/50 rounded-xl border border-gray-700 border-dashed">
                  ยังไม่มีใครลงชื่อเลย
                </div>
              ) : (
                Object.entries(groupedData).map(([dateStr, names]: [string, any]) => (
                  <div key={dateStr} className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                    <div className="text-emerald-400 font-bold mb-3 border-b border-gray-700 pb-2">
                      {new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {names.map((n: string, i: number) => (
                        <span key={i} className="bg-blue-500/10 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/20 font-medium">
                          🙋‍♂️ {n}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-gray-400 mt-3 text-right">
                      รวมทั้งหมด <span className="font-bold text-white">{names.length}</span> คน
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}