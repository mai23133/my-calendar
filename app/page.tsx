'use client'
import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { supabase } from './supabase'

export default function Home() {
  const [date, setDate] = useState<any>(new Date())
  const [name, setName] = useState('')
  const [list, setList] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  const fetchAvailability = async () => {
    const { data } = await supabase.from('availability').select('*')
    if (data) setList(data)
  }

  useEffect(() => { 
    setMounted(true) 
    fetchAvailability() 
  }, [])

  const saveStatus = async () => {
    if (!name) return alert('กรุณาใส่ชื่อด้วยนะ!')
    
    // ปรับรูปแบบวันที่ให้สวยขึ้นตอนเซฟ
    const selectedDate = date.toISOString().split('T')[0]
    
    await supabase.from('availability').insert([
      { name, date: selectedDate, status: 'ว่าง' }
    ])
    setName('')
    fetchAvailability()
  }

  if (!mounted) return null

  return (
    // เปลี่ยนพื้นหลังให้ไล่สี ดูมีมิติขึ้น
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 flex flex-col items-center font-sans">
      
      <div className="max-w-md w-full flex flex-col items-center">
        <h1 className="text-3xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          📅 ปฏิทินเช็กวันว่าง
        </h1>
        
        {/* กรอบปฏิทิน */}
        <div className="bg-white p-6 rounded-2xl shadow-2xl text-black w-full flex justify-center mb-8 transform transition-all hover:scale-[1.02]">
          <Calendar 
            onChange={setDate} 
            value={date} 
            locale="th-TH" // เปลี่ยนเป็นปฏิทินภาษาไทย
            className="border-none font-medium"
          />
        </div>

        {/* โซนกรอกชื่อและปุ่ม */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mb-10">
          <input 
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            placeholder="ใส่ชื่อของคุณตรงนี้..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button 
            onClick={saveStatus} 
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-500 hover:-translate-y-1 transition-all active:translate-y-0"
          >
            ยืนยันวันว่าง
          </button>
        </div>

        {/* โซนแสดงรายชื่อ */}
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
            <span>👇</span> เพื่อนที่ลงชื่อแล้ว ({list.length} คน)
          </h2>
          
          <div className="space-y-3">
            {list.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700 flex justify-between items-center shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    ✅
                  </div>
                  <span className="font-bold text-white text-lg">{item.name}</span>
                </div>
                <div className="text-sm font-medium text-blue-300 bg-blue-900/30 px-3 py-1 rounded-full">
                  {new Date(item.date).toLocaleDateString('th-TH', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })}
                </div>
              </div>
            ))}
            
            {list.length === 0 && (
              <div className="text-center py-8 text-gray-500 italic bg-gray-800/30 rounded-xl border border-gray-700 border-dashed">
                ยังไม่มีใครลงชื่อเลย เป็นคนแรกสิ!
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}