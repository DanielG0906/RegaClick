import { useState, useEffect, useRef, useCallback } from 'react'
import './SetupPortal.css'

// ══════════════════════════════════════════════
//  CONFIG — אוטומטי לפי סביבה
// ══════════════════════════════════════════════
const IS_LOCAL = window.location.protocol === 'file:'

const SETUP_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwpYzRO0vSM8eqY8EVos4q9fF6pmVtLXhM6MGoqP3A7gppbq5JiQFsFLkmq8B5wKs_p/exec'

const APP_BASE_URL = IS_LOCAL
  ? 'file:///C:/Users/Daniel%20Gurevich/OneDrive%20-%20Open%20University%20of%20Israel/שולחן%20העבודה/RegaClick/RegaClick/index.html'
  : 'https://danielg0906.github.io/RegaClick/#/'

const APP_QR_URL = IS_LOCAL
  ? 'file:///C:/Users/Daniel%20Gurevich/OneDrive%20-%20Open%20University%20of%20Israel/שולחן%20העבודה/RegaClick/RegaClick/wedding-qr.html'
  : 'https://danielg0906.github.io/RegaClick/#/wedding-qr'

// ══════════════════════════════════════════════

const THEMES: Record<
  string,
  {
    rose: string
    gold: string
    deep: string
    blush: string
    cream: string
    name: string
    desc?: string
    screen: string
  }
> = {
  classic: { rose: '#c4896f', gold: '#c9a96e', deep: '#3a2820', blush: '#e8c5b0', cream: '#faf6f1', name: 'קלאסי לבן', desc: 'אלגנטיות נצחית בגוני שנהב חמים', screen: 'screen-classic' },
  boho: { rose: '#c9956a', gold: '#b07840', deep: '#3d1f10', blush: '#e8c0a0', cream: '#f5ede0', name: 'בוהו טרקוטה', desc: 'חמימות אדמתית עם גוונים טרקוטה', screen: 'screen-boho' },
  turciz: { rose: '#c9a96e', gold: '#e8c87a', deep: '#f0e0c0', blush: 'rgba(201,169,110,0.4)', cream: '#0d2b2e', name: 'טורקיז לילה', desc: 'מסתורי ומרהיב בגוני כהה וזהב', screen: 'screen-turciz' },
  floral: { rose: '#c8899e', gold: '#d4a0b5', deep: '#4a1530', blush: '#f0c0d0', cream: '#fdf0f5', name: 'פרחוני ורוד', desc: 'רומנטי ועדין עם גוונים ורודים', screen: 'screen-floral' },
  minimal: { rose: '#888880', gold: '#a8a8a0', deep: '#2a2a28', blush: '#d8d8d4', cream: '#f8f8f6', name: 'מינימליסטי', desc: 'פשטות נקייה ועיצוב נטול הסחות', screen: 'screen-minimal' },
  sage: { rose: '#4a7c59', gold: '#6b8f71', deep: '#1a3020', blush: '#c0d8c0', cream: '#f0f5f0', name: 'מרווה ירוקה', desc: 'שלווה טבעית בגוני ירוק ואפור', screen: 'screen-sage' },
  navy: { rose: '#7eb8d4', gold: '#4a9bbf', deep: '#e8f4f8', blush: 'rgba(126,184,212,0.2)', cream: '#0d1b2a', name: 'כחול לילה', desc: 'ים ושמיים בגוני כחול עמוק', screen: 'screen-navy' },
  blush: { rose: '#e8607a', gold: '#f0a0b0', deep: '#3a1520', blush: '#ffd6de', cream: '#fff0f3', name: 'ורוד עדין', desc: 'חלומי ורומנטי בגוני ורוד פסטל', screen: 'screen-blush' },
  earth: { rose: '#8b6914', gold: '#c9a030', deep: '#2a1a08', blush: '#e8d8b0', cream: '#fdf8ef', name: 'אדמה וזהב', desc: 'עוצמה אדמתית עם ניצנוצי זהב', screen: 'screen-earth' },
  lavender: { rose: '#7b4fa0', gold: '#9b72cf', deep: '#2a1040', blush: '#e8daff', cream: '#f8f4ff', name: 'לבנדר', desc: 'קסם ארגמני בגוני לבנדר עדין', screen: 'screen-lavender' },
}

const FONT_FAMILIES: Record<string, string> = {
  cormorant: "'Cormorant Garamond', serif",
  playfair: "'Playfair Display', serif",
  dancing: "'Dancing Script', cursive",
  josefin: "'Josefin Sans', sans-serif",
  baskerville: "'Libre Baskerville', serif",
  greatvibes: "'Great Vibes', cursive",
  cinzel: "'Cinzel', serif",
  lora: "'Lora', serif",
  nunito: "'Nunito', sans-serif",
}

const FONT_SIZES: Record<string, string> = {
  small: '0.85rem',
  medium: '1.2rem',
  large: '1.55rem',
  xlarge: '1.9rem',
}

const TEXTURES_JS: Record<string, string> = {
  none: '',
  petals: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(0 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(72 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(144 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(216 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(288 20 20)'/%3E%3C/svg%3E")`,
  dots: 'radial-gradient(circle, rgba(201,169,110,0.4) 1px, transparent 1px)',
  grid: 'linear-gradient(rgba(201,169,110,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,.12) 1px, transparent 1px)',
  leaves: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Cpath d='M25,5 Q35,25 25,45 Q15,25 25,5Z' fill='none' stroke='%238a9e8b' stroke-width='1' opacity='.35'/%3E%3Cpath d='M5,25 Q25,15 45,25 Q25,35 5,25Z' fill='none' stroke='%238a9e8b' stroke-width='1' opacity='.25'/%3E%3C/svg%3E")`,
  waves: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='20'%3E%3Cpath d='M0,10 Q15,0 30,10 Q45,20 60,10' fill='none' stroke='%23c9a96e' stroke-width='1' opacity='.3'/%3E%3C/svg%3E")`,
  diamonds: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Crect x='15' y='2' width='18' height='18' fill='none' stroke='%23c9a96e' stroke-width='0.8' opacity='.3' transform='rotate(45 15 11)'/%3E%3C/svg%3E")`,
  crosses: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cline x1='12' y1='4' x2='12' y2='20' stroke='%23c9a96e' stroke-width='0.8' opacity='.25'/%3E%3Cline x1='4' y1='12' x2='20' y2='12' stroke='%23c9a96e' stroke-width='0.8' opacity='.25'/%3E%3C/svg%3E")`,
}

const THEME_GRADIENTS: Record<string, string> = {
  classic: 'linear-gradient(160deg, #faf6f0, #f0e8dc)',
  boho: 'linear-gradient(160deg, #f5ede0, #e8d0b8)',
  turciz: 'linear-gradient(160deg, #0d2b2e, #1a4a4f)',
  floral: 'linear-gradient(160deg, #fdf0f5, #f5dde8)',
  minimal: 'linear-gradient(160deg, #f8f8f6, #eeeeea)',
  sage: 'linear-gradient(160deg, #eef5ee, #d4e8d5)',
  navy: 'linear-gradient(160deg, #0d1b2a, #1e3a5f)',
  blush: 'linear-gradient(160deg, #fff0f3, #ffd6de)',
  earth: 'linear-gradient(160deg, #fdf8ef, #f0e0c0)',
  lavender: 'linear-gradient(160deg, #f8f4ff, #e8daff)',
}

const THEME_GRADIENTS_TEXTURE: Record<string, string> = {
  classic: 'linear-gradient(160deg, #faf6f0, #f0e8dc)',
  boho: 'linear-gradient(160deg, #f5ede0, #e8d0b8)',
  turciz: 'linear-gradient(160deg, #0d2b2e, #0d2b2e)',
  floral: 'linear-gradient(160deg, #fdf0f5, #f5dde8)',
  minimal: 'linear-gradient(160deg, #f8f8f6, #eeeeea)',
  sage: 'linear-gradient(160deg, #eef5ee, #d4e8d5)',
  navy: 'linear-gradient(160deg, #0d1b2a, #1e3a5f)',
  blush: 'linear-gradient(160deg, #fff0f3, #ffd6de)',
  earth: 'linear-gradient(160deg, #fdf8ef, #f0e0c0)',
  lavender: 'linear-gradient(160deg, #f8f4ff, #e8daff)',
}

const TEX_SIZES: Record<string, string> = {
  dots: '18px 18px',
  grid: '20px 20px',
  waves: '60px 20px',
  diamonds: '30px 30px',
  crosses: '24px 24px',
  petals: '40px 40px',
  leaves: '50px 50px',
}

function generateId(_bride: string, _groom: string): string {
  const timestamp = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 7)
  return 'ev-' + timestamp + '-' + rand
}

export default function SetupPortal() {
  // ── State ──
  const [selectedTheme, setSelectedTheme] = useState('classic')
  const [selectedFont, setSelectedFont] = useState('cormorant')
  const [selectedTexture, setSelectedTexture] = useState('none')
  const [selectedFontColor, setSelectedFontColor] = useState('#3a2820')
  const [selectedFontSize, setSelectedFontSize] = useState('medium')
  const [selectedFontWeight, setSelectedFontWeight] = useState('400')
  const [isLocked, setIsLocked] = useState(false)
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  const [currentPreviewMode, setCurrentPreviewMode] = useState<'app' | 'qr'>('app')

  // OTP flow
  const [email, setEmail] = useState('')
  const [emailDisabled, setEmailDisabled] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpVisible, setOtpVisible] = useState(false)
  const [otpResendVisible, setOtpResendVisible] = useState(false)
  const [otpResendText, setOtpResendText] = useState('שלח קוד חדש')
  const [otpResendDisabled, setOtpResendDisabled] = useState(false)

  // form fields
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')

  // output
  const [outputEventId, setOutputEventId] = useState<string | null>(null)

  // toast
  const [toast, setToast] = useState({ msg: '', type: '', show: false })

  // status messages
  const [lookupStatus, setLookupStatus] = useState({ text: '', cls: '' })

  // lookup/otp button states
  const [lookupBtnText, setLookupBtnText] = useState('המשך ←')
  const [lookupBtnDisabled, setLookupBtnDisabled] = useState(false)
  const [otpBtnText, setOtpBtnText] = useState('אמת ←')
  const [otpBtnDisabled, setOtpBtnDisabled] = useState(false)

  // save button state
  const [saveBtnText, setSaveBtnText] = useState('שמור וצור קישור QR')
  const [saveBtnDisabled, setSaveBtnDisabled] = useState(false)
  const [saveSpinnerVisible, setSaveSpinnerVisible] = useState(false)
  const [saveBtnHidden, setSaveBtnHidden] = useState(false)

  // field errors
  const [brideNameError, setBrideNameError] = useState(false)
  const [groomNameError, setGroomNameError] = useState(false)
  const [brideNameShake, setBrideNameShake] = useState(false)
  const [groomNameShake, setGroomNameShake] = useState(false)
  const [dateError, setDateError] = useState('')

  // refs
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const otpCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const brideNameInputRef = useRef<HTMLInputElement>(null)
  const groomNameInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const outputSectionRef = useRef<HTMLDivElement>(null)

  // ── Toast ──
  const showToast = useCallback((msg: string, type = '') => {
    setToast({ msg, type, show: true })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast({ msg: '', type: '', show: false }), 3200)
  }, [])

  // ── Field error helpers ──
  function showFieldError(field: 'brideName' | 'groomName') {
    if (field === 'brideName') {
      setBrideNameError(true)
      setBrideNameShake(true)
      setTimeout(() => setBrideNameShake(false), 500)
      brideNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      setGroomNameError(true)
      setGroomNameShake(true)
      setTimeout(() => setGroomNameShake(false), 500)
      groomNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // ── Date validation ──
  function validateDate(): boolean {
    if (!weddingDate) {
      setDateError('יש להזין תאריך חתונה')
      dateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      dateInputRef.current?.focus()
      return false
    }
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const chosen = new Date(weddingDate + 'T00:00:00')
    if (chosen <= tomorrow) {
      setDateError('⚠️ יש לבחור תאריך שהוא לפחות יומיים מהיום')
      dateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    setDateError('')
    return true
  }

  // ── checkLocked ──
  function checkLocked(date: string, eventId: string | null) {
    if (!date) return
    const h = (new Date(date + 'T00:00:00').getTime() - Date.now()) / 3600000
    const locked = h <= 24
    setIsLocked(locked)
    setSaveBtnHidden(locked)
    if (locked && eventId) setOutputEventId(eventId)
  }

  // ── OTP flow ──
  async function lookupEmailHandler() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return showToast('אנא הכניסו כתובת מייל תקינה', 'error')
    await sendOTPHandler(trimmedEmail)
  }

  async function sendOTPHandler(emailOverride?: string) {
    const target = emailOverride || email.trim()
    setLookupBtnText('...')
    setLookupBtnDisabled(true)

    try {
      const res = await fetch(`${SETUP_GAS_URL}?action=sendOTP&email=${encodeURIComponent(target)}`)
      const data = await res.json()

      if (!data.sent) {
        showToast(data.error || 'שגיאה בשליחת קוד', 'error')
        setLookupBtnText('המשך ←')
        setLookupBtnDisabled(false)
        return
      }

      setLookupStatus({ text: `✉️ קוד אימות נשלח ל-${target}`, cls: 'new' })
      setOtpVisible(true)
      setEmailDisabled(true)
      setLookupBtnText('נשלח ✓')
      setLookupBtnDisabled(true)

      // Countdown 45s for resend
      let secs = 45
      setOtpResendText(`שלח קוד חדש (${secs}s)`)
      setOtpResendVisible(true)
      setOtpResendDisabled(true)
      if (otpCountdownRef.current) clearInterval(otpCountdownRef.current)
      otpCountdownRef.current = setInterval(() => {
        secs--
        setOtpResendText(`שלח קוד חדש (${secs}s)`)
        if (secs <= 0) {
          if (otpCountdownRef.current) clearInterval(otpCountdownRef.current)
          setOtpResendText('שלח קוד חדש')
          setOtpResendDisabled(false)
        }
      }, 1000)
    } catch {
      showToast('שגיאה בשליחת קוד — נסה שוב', 'error')
      setLookupBtnText('המשך ←')
      setLookupBtnDisabled(false)
    }
  }

  async function verifyOTPHandler() {
    const trimmedOtp = otp.trim()
    if (trimmedOtp.length !== 6) return showToast('אנא הכניסו קוד בן 6 ספרות', 'error')

    setOtpBtnText('...')
    setOtpBtnDisabled(true)

    try {
      const res = await fetch(
        `${SETUP_GAS_URL}?action=verifyOTP&email=${encodeURIComponent(email.trim())}&otp=${trimmedOtp}`
      )
      const data = await res.json()

      if (data.verified) {
        setOtpVisible(false)
        if (data.found) {
          setLookupStatus({ text: '✓ ברוכים הבאים חזרה! הפרטים שלכם נטענו.', cls: 'found' })
          populateForm(data.record)
          setTimeout(() => {
            outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 300)
        } else {
          setLookupStatus({ text: '✦ זוג חדש — בואו נגדיר את האירוע שלכם!', cls: 'new' })
        }
        setFormVisible(true)
      } else {
        showToast(data.error || 'קוד שגוי — נסה שוב', 'error')
        setOtp('')
        setOtpBtnText('אמת ←')
        setOtpBtnDisabled(false)
      }
    } catch {
      showToast('שגיאה — נסה שוב', 'error')
      setOtpBtnText('אמת ←')
      setOtpBtnDisabled(false)
    }
  }

  interface FormRecord {
    brideName?: string
    groomName?: string
    weddingDate?: string
    theme?: string
    font?: string
    texture?: string
    fontColor?: string
    fontSize?: string
    fontWeight?: string
    eventId?: string
  }

  function populateForm(r: FormRecord) {
    if (r.brideName) setBrideName(r.brideName)
    if (r.groomName) setGroomName(r.groomName)
    if (r.weddingDate) setWeddingDate(r.weddingDate)
    if (r.theme) setSelectedTheme(r.theme)
    if (r.font) setSelectedFont(r.font)
    if (r.texture) setSelectedTexture(r.texture)
    if (r.fontColor) setSelectedFontColor(r.fontColor)
    if (r.fontSize) setSelectedFontSize(r.fontSize)
    if (r.fontWeight) setSelectedFontWeight(r.fontWeight)
    if (r.eventId) {
      setCurrentEventId(r.eventId)
      setOutputEventId(r.eventId)
    }
    if (r.weddingDate) checkLocked(r.weddingDate, r.eventId || null)
  }

  // ── Save ──
  async function saveData() {
    const trimmedBride = brideName.trim()
    const trimmedGroom = groomName.trim()
    if (!trimmedBride) { showFieldError('brideName'); return }
    if (!trimmedGroom) { showFieldError('groomName'); return }
    if (!validateDate()) return

    setSaveBtnDisabled(true)
    setSaveBtnText('שומר...')
    setSaveSpinnerVisible(true)

    const eventId = currentEventId || generateId(trimmedBride, trimmedGroom)
    try {
      await fetch(SETUP_GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'save',
          email: email.trim(),
          brideName: trimmedBride,
          groomName: trimmedGroom,
          weddingDate,
          theme: selectedTheme,
          font: selectedFont,
          texture: selectedTexture,
          fontColor: selectedFontColor,
          fontSize: selectedFontSize,
          fontWeight: selectedFontWeight,
          eventId,
        }),
      })
      setCurrentEventId(eventId)
      setOutputEventId(eventId)
      showToast('נשמר בהצלחה! 🎉', 'success')
    } catch {
      setCurrentEventId(eventId)
      setOutputEventId(eventId)
      showToast('נשמר! (מצב דמו)', 'success')
    }
    setSaveBtnDisabled(false)
    setSaveBtnText('שמור וצור קישור QR')
    setSaveSpinnerVisible(false)

    // scroll output into view
    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }

  function downloadMainPage() {
    const a = document.createElement('a')
    a.href = APP_BASE_URL + '?eventID=' + currentEventId
    a.target = '_blank'
    a.click()
    showToast('פותח מסך ראשי... 💕', 'success')
  }

  function downloadQR() {
    const a = document.createElement('a')
    a.href = APP_QR_URL + '?eventID=' + currentEventId
    a.target = '_blank'
    a.click()
    showToast('פותח QR... 💕', 'success')
  }

  // ── Enter key handlers ──
  useEffect(() => { document.title = 'RegaClick - setUp' }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && otpVisible) verifyOTPHandler()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [otpVisible, otp, email])

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (otpCountdownRef.current) clearInterval(otpCountdownRef.current)
    }
  }, [])

  // ── Derived: phone screen background style ──
  function getPhoneScreenStyle(): React.CSSProperties {
    if (selectedTexture !== 'none') {
      const texSize = TEX_SIZES[selectedTexture] || 'auto'
      const grad = THEME_GRADIENTS_TEXTURE[selectedTheme] || THEME_GRADIENTS_TEXTURE.classic
      return {
        backgroundImage: `${TEXTURES_JS[selectedTexture]}, ${grad}`,
        backgroundSize: `${texSize}, cover`,
        backgroundRepeat: 'repeat',
      }
    }
    return {
      backgroundImage: THEME_GRADIENTS[selectedTheme] || THEME_GRADIENTS.classic,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    }
  }

  // ── Derived: preview couple text / font styles ──
  const t = THEMES[selectedTheme] || THEMES.classic
  const roseColor = t.rose || '#c4896f'
  const displayBride = brideName || 'כלה'
  const displayGroom = groomName || 'חתן'

  function getFormattedDate(): string {
    if (!weddingDate) return 'תאריך החתונה'
    const d = new Date(weddingDate + 'T00:00:00')
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const dateStr = getFormattedDate()

  const coupleFontStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILIES[selectedFont] || FONT_FAMILIES.cormorant,
    color: selectedFontColor,
    fontSize: FONT_SIZES[selectedFontSize] || '1.2rem',
    fontWeight: selectedFontWeight as React.CSSProperties['fontWeight'],
    fontStyle: 'italic',
  }

  const qrMiniCardStyle: React.CSSProperties = {
    '--rose': t.rose || '#c4896f',
    '--gold': t.gold || '#c9a96e',
    '--deep': t.deep || '#3a2820',
    '--blush': t.blush || '#e8c5b0',
  } as React.CSSProperties

  const qrMiniFontStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILIES[selectedFont] || FONT_FAMILIES.cormorant,
    color: '#3a2820',
    fontSize: FONT_SIZES[selectedFontSize] || '1.6rem',
    fontWeight: selectedFontWeight as React.CSSProperties['fontWeight'],
    fontStyle: 'italic',
  }

  return (
    <>
      <div className="bg-texture"></div>
      <div className="page">

        {/* FORM PANEL */}
        <div className="form-panel">
          <div className="logo">
            <div className="logo-mark">♡</div>
            <span className="logo-text">RegaClick — הגדרת אירוע</span>
          </div>

          <h1 className="page-title">
            צרו את<br /><em>אלבום החתונה</em> שלכם
          </h1>
          <p className="page-sub">
            הגדירו את האירוע שלכם תוך דקות. האורחים יסרקו QR ויעלו זכרונות ישירות לאלבום המשותף שלכם.
          </p>

          {/* LOOKUP SECTION */}
          <div className="lookup-section">
            <label className="lookup-label">התחילו עם כתובת המייל שלכם</label>
            <div className="lookup-row">
              <input
                className="lookup-input"
                type="email"
                id="lookupEmail"
                placeholder="your@email.com"
                value={email}
                disabled={emailDisabled}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') lookupEmailHandler() }}
              />
              <button
                className="lookup-btn"
                id="lookupBtn"
                disabled={lookupBtnDisabled}
                onClick={lookupEmailHandler}
              >
                {lookupBtnText}
              </button>
            </div>

            {lookupStatus.text && (
              <div className={`lookup-status ${lookupStatus.cls}`} id="lookupStatus">
                {lookupStatus.text}
              </div>
            )}
            {!lookupStatus.text && (
              <div className="lookup-status" id="lookupStatus"></div>
            )}

            {/* OTP wrap */}
            <div className={`otp-wrap${otpVisible ? ' visible' : ''}`} id="otpWrap">
              <label className="otp-label">קוד אימות נשלח למייל שלכם</label>
              <div className="otp-row">
                <input
                  className="otp-input"
                  type="text"
                  id="otpInput"
                  placeholder="○ ○ ○ ○ ○ ○"
                  maxLength={6}
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
                <button
                  className="otp-btn"
                  disabled={otpBtnDisabled}
                  onClick={verifyOTPHandler}
                >
                  {otpBtnText}
                </button>
              </div>
              <div
                className={`otp-resend${otpResendVisible ? ' visible' : ''}`}
                id="otpResend"
                style={otpResendDisabled ? { pointerEvents: 'none', opacity: '.5' } : {}}
                onClick={() => !otpResendDisabled && sendOTPHandler()}
              >
                {otpResendText}
              </div>
            </div>
          </div>

          {/* FORM BODY */}
          <div className={`form-body${formVisible ? ' visible' : ''}`} id="formBody">

            {/* Happy couple section */}
            <div className="form-section">
              <div className="section-title">הזוג המאושר</div>
              <div className="field-row">
                <div className="field">
                  <label>שם הכלה</label>
                  <input
                    ref={brideNameInputRef}
                    type="text"
                    id="brideName"
                    placeholder="שם הכלה"
                    disabled={isLocked}
                    value={brideName}
                    className={`${brideNameError ? 'field-error' : ''}${brideNameShake ? ' shake' : ''}`}
                    onInput={() => { setBrideNameError(false) }}
                    onChange={e => { setBrideName(e.target.value); setBrideNameError(false) }}
                  />
                  <div className={`field-error-msg${brideNameError ? ' show' : ''}`} id="brideNameErr">
                    יש להזין שם כלה
                  </div>
                </div>
                <div className="field">
                  <label>שם החתן</label>
                  <input
                    ref={groomNameInputRef}
                    type="text"
                    id="groomName"
                    placeholder="שם החתן"
                    disabled={isLocked}
                    value={groomName}
                    className={`${groomNameError ? 'field-error' : ''}${groomNameShake ? ' shake' : ''}`}
                    onInput={() => { setGroomNameError(false) }}
                    onChange={e => { setGroomName(e.target.value); setGroomNameError(false) }}
                  />
                  <div className={`field-error-msg${groomNameError ? ' show' : ''}`} id="groomNameErr">
                    יש להזין שם חתן
                  </div>
                </div>
              </div>
              <div className="field">
                <label>תאריך החתונה</label>
                <input
                  ref={dateInputRef}
                  type="date"
                  id="weddingDate"
                  disabled={isLocked}
                  value={weddingDate}
                  onChange={e => {
                    setWeddingDate(e.target.value)
                    // validateDate will run after state settles — call inline with new val
                    const v = e.target.value
                    if (!v) { setDateError(''); return }
                    const tomorrow = new Date()
                    tomorrow.setHours(0, 0, 0, 0)
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    const chosen = new Date(v + 'T00:00:00')
                    if (chosen <= tomorrow) {
                      setDateError('⚠️ יש לבחור תאריך שהוא לפחות יומיים מהיום')
                    } else {
                      setDateError('')
                    }
                  }}
                />
                <div className={`field-error-msg${dateError ? ' show' : ''}`} id="dateError">
                  {dateError}
                </div>
              </div>
            </div>

            {/* Design section */}
            <div className="form-section">
              <div className="section-title">בחרו עיצוב לאפליקציה</div>
              <div className="themes-grid">
                {[
                  { key: 'classic', label: 'קלאסי', swatchClass: 't-classic' },
                  { key: 'boho', label: 'בוהו', swatchClass: 't-boho' },
                  { key: 'turciz', label: 'טורקיז לילה', swatchClass: 't-turciz' },
                  { key: 'floral', label: 'פרחוני', swatchClass: 't-floral' },
                  { key: 'minimal', label: 'מינימל', swatchClass: 't-minimal' },
                  { key: 'sage', label: 'מרווה', swatchClass: 't-sage' },
                  { key: 'navy', label: 'כחול לילה', swatchClass: 't-navy' },
                  { key: 'blush', label: 'ורוד עדין', swatchClass: 't-blush' },
                  { key: 'earth', label: 'אדמה', swatchClass: 't-earth' },
                  { key: 'lavender', label: 'לבנדר', swatchClass: 't-lavender' },
                ].map(({ key, label, swatchClass }) => (
                  <div
                    key={key}
                    className={`theme-card${selectedTheme === key ? ' selected' : ''}`}
                    data-theme={key}
                    style={isLocked ? { opacity: '.5', cursor: 'not-allowed' } : {}}
                    onClick={() => { if (!isLocked) setSelectedTheme(key) }}
                  >
                    <div className="theme-check">✓</div>
                    <div className={`theme-swatch ${swatchClass}`}></div>
                    <div className="theme-name">{label}</div>
                  </div>
                ))}
              </div>

              {/* FONT PICKER */}
              <div className="section-title" style={{ marginTop: '20px', marginBottom: '8px' }}>
                גופן לשמות הזוג
              </div>
              <div className="font-picker">
                {[
                  { key: 'cormorant', cls: 'f-cormorant', sample: 'Love', label: 'קורמורנט' },
                  { key: 'playfair', cls: 'f-playfair', sample: 'Love', label: 'פלייפייר' },
                  { key: 'dancing', cls: 'f-dancing', sample: 'Love', label: 'דנסינג' },
                  { key: 'josefin', cls: 'f-josefin', sample: 'Love', label: "ז'וזפין" },
                  { key: 'baskerville', cls: 'f-baskerville', sample: 'Love', label: 'בסקרוויל' },
                  { key: 'greatvibes', cls: 'f-greatvibes', sample: 'Love', label: 'Great Vibes' },
                  { key: 'cinzel', cls: 'f-cinzel', sample: 'LOVE', label: 'Cinzel' },
                  { key: 'lora', cls: 'f-lora', sample: 'Love', label: 'Lora' },
                  { key: 'nunito', cls: 'f-nunito', sample: 'Love', label: 'Nunito' },
                ].map(({ key, cls, sample, label }) => (
                  <div
                    key={key}
                    className={`font-card ${cls}${selectedFont === key ? ' selected' : ''}`}
                    data-font={key}
                    style={isLocked ? { opacity: '.5', cursor: 'not-allowed' } : {}}
                    onClick={() => { if (!isLocked) setSelectedFont(key) }}
                  >
                    <div className="theme-check">✓</div>
                    <div className="font-card-sample">{sample}</div>
                    <div className="font-card-name">{label}</div>
                  </div>
                ))}
              </div>

              {/* FONT STYLE CONTROLS */}
              <div className="font-style-controls">
                <div className="font-style-row">
                  <span className="font-style-label">צבע</span>
                  <div className="color-swatches">
                    {[
                      { color: '#3a2820', title: 'כהה', extraStyle: {} },
                      { color: '#c4896f', title: 'רוז', extraStyle: {} },
                      { color: '#c9a96e', title: 'זהב', extraStyle: {} },
                      { color: '#7b4fa0', title: 'סגול', extraStyle: {} },
                      { color: '#4a7c59', title: 'ירוק', extraStyle: {} },
                      { color: '#1e3a5f', title: 'כחול', extraStyle: {} },
                      { color: '#ffffff', title: 'לבן', extraStyle: { border: '1.5px solid #e0d8d0' } },
                    ].map(({ color, title, extraStyle }) => (
                      <div
                        key={color}
                        className={`color-swatch${selectedFontColor === color ? ' active' : ''}`}
                        data-color={color}
                        style={{ background: color, ...extraStyle, ...(isLocked ? { opacity: '.5', cursor: 'not-allowed' } : {}) }}
                        title={title}
                        onClick={() => { if (!isLocked) setSelectedFontColor(color) }}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="font-style-row">
                  <span className="font-style-label">גודל</span>
                  <div className="size-btns">
                    {[
                      { size: 'small', label: 'S' },
                      { size: 'medium', label: 'M' },
                      { size: 'large', label: 'L' },
                      { size: 'xlarge', label: 'XL' },
                    ].map(({ size, label }) => (
                      <button
                        key={size}
                        className={`size-btn${selectedFontSize === size ? ' active' : ''}`}
                        data-size={size}
                        disabled={isLocked}
                        onClick={() => setSelectedFontSize(size)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="font-style-row">
                  <span className="font-style-label">משקל</span>
                  <div className="weight-btns">
                    {[
                      { weight: '400', label: 'רגיל' },
                      { weight: '600', label: 'עבה' },
                    ].map(({ weight, label }) => (
                      <button
                        key={weight}
                        className={`weight-btn${selectedFontWeight === weight ? ' active' : ''}`}
                        data-weight={weight}
                        disabled={isLocked}
                        onClick={() => setSelectedFontWeight(weight)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* TEXTURE PICKER */}
              <div className="section-title" style={{ marginTop: '20px', marginBottom: '8px' }}>
                טקסטורת רקע
              </div>
              <div className="texture-picker">
                {[
                  { key: 'none', cls: 'tx-none', label: 'ללא' },
                  { key: 'petals', cls: 'tx-petals', label: 'פרחים' },
                  { key: 'dots', cls: 'tx-dots', label: 'נקודות' },
                  { key: 'grid', cls: 'tx-grid', label: 'רשת' },
                  { key: 'leaves', cls: 'tx-leaves', label: 'עלים' },
                  { key: 'waves', cls: 'tx-waves', label: 'גלים' },
                  { key: 'diamonds', cls: 'tx-diamonds', label: 'יהלומים' },
                  { key: 'crosses', cls: 'tx-crosses', label: 'פלוס' },
                ].map(({ key, cls, label }) => (
                  <div
                    key={key}
                    className={`texture-card${selectedTexture === key ? ' selected' : ''}`}
                    data-texture={key}
                    style={isLocked ? { opacity: '.5', cursor: 'not-allowed' } : {}}
                    onClick={() => { if (!isLocked) setSelectedTexture(key) }}
                  >
                    <div className="theme-check">✓</div>
                    <div className={`texture-preview ${cls}`}></div>
                    <div className="texture-label">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SAVE BUTTON */}
            <button
              className="save-btn"
              id="saveBtn"
              disabled={saveBtnDisabled}
              style={saveBtnHidden ? { display: 'none' } : { display: 'flex' }}
              onClick={saveData}
            >
              <span id="saveBtnText">{saveBtnText}</span>
              <div
                className="spinner"
                id="saveSpinner"
                style={{ display: saveSpinnerVisible ? 'block' : 'none' }}
              ></div>
            </button>

            {/* LOCKED BANNER */}
            <div className={`locked-banner${isLocked ? ' visible' : ''}`} id="lockedBanner">
              <div className="lock-icon">🔒</div>
              <div className="lock-text">
                <h3>האירוע נעול — ה-QR שלכם מוכן!</h3>
                <p>עריכה מושבתת 24 שעות לפני החתונה. הכל מוכן לאירוע!</p>
              </div>
            </div>

            {/* OUTPUT SECTION */}
            <div
              className={`output-section${outputEventId ? ' visible' : ''}`}
              id="outputSection"
              ref={outputSectionRef}
            >
              <div className="output-title">האירוע שלכם מוכן ✨</div>
              <div className="output-btns">
                <button className="out-btn out-btn-primary" onClick={downloadMainPage}>
                  📱 הורד מסך ראשי
                </button>
                <button className="out-btn out-btn-secondary" onClick={downloadQR}>
                  🔲 הורד QR
                </button>
              </div>
              <div className="output-disclaimer">
                <span className="disclaimer-star">✦</span>
                התחרטתם? אל דאגה — ניתן לחזור ולשנות את העיצוב בכל עת עד יומיים לפני החתונה
              </div>
            </div>

          </div>
        </div>

        {/* PREVIEW PANEL */}
        <div className="preview-panel">
          <div className="preview-header">
            <div className="preview-label">תצוגה מקדימה חיה</div>
            <div className="preview-switcher">
              <button
                className={`switcher-btn${currentPreviewMode === 'app' ? ' active' : ''}`}
                id="switcherApp"
                onClick={() => setCurrentPreviewMode('app')}
              >
                📱 מסך ראשי
              </button>
              <button
                className={`switcher-btn${currentPreviewMode === 'qr' ? ' active' : ''}`}
                id="switcherQR"
                onClick={() => setCurrentPreviewMode('qr')}
              >
                🔲 מסך QR
              </button>
            </div>
          </div>

          <div className="preview-body">
            <div className="preview-screens-wrap" style={{ height: '100%', width: '200px' }}>

              {/* App phone preview */}
              <div
                className={`preview-phone-wrap${currentPreviewMode === 'qr' ? ' slide-out' : ''}`}
                id="previewPhoneWrap"
              >
                <div className="phone-wrap">
                  <div className="phone-shell">
                    <div
                      className={`phone-screen ${t.screen}`}
                      id="phoneScreen"
                      style={getPhoneScreenStyle()}
                    >
                      <div className="screen-content">
                        <div className="preview-header-area">
                          <div
                            className="preview-couple"
                            id="previewCouple"
                            style={coupleFontStyle}
                          >
                            <span className="name">{displayBride}</span>
                            <span className="amp-span" style={{ color: roseColor }}>&</span>
                            <span className="name">{displayGroom}</span>
                          </div>
                          <div className="preview-heart-divider">
                            <div className="preview-line"></div>
                            <svg
                              width="7"
                              height="7"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="preview-heart-icon"
                            >
                              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                            </svg>
                            <div className="preview-line"></div>
                          </div>
                          <div className="preview-date" id="previewDate">
                            {weddingDate ? `${dateStr} · בואו נתעד את הרגעים` : 'תאריך החתונה · בואו נתעד'}
                          </div>
                          <div className="preview-mode-btns">
                            <div className="preview-mode-btn active-btn">📷 תמונה</div>
                            <div className="preview-mode-btn">🎬 וידאו</div>
                          </div>
                        </div>
                        <div className="preview-cam-area">
                          <div className="preview-cam-icon">📷</div>
                        </div>
                        <div className="preview-bottom-bar">
                          <div className="preview-shutter"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR mini preview */}
              <div
                className={`preview-qr-wrap${currentPreviewMode === 'qr' ? ' slide-in' : ''}`}
                id="previewQRWrap"
              >
                <div className="qr-mini-card" id="qrMiniCard" style={qrMiniCardStyle}>
                  <div className="qr-mini-eyebrow">מוזמנים לשתף איתנו</div>
                  <div
                    className="qr-mini-couple"
                    id="qrMiniCouple"
                    style={qrMiniFontStyle}
                  >
                    <span className="name">{displayBride}</span>
                    <span style={{ color: roseColor }}>&</span>
                    <span className="name">{displayGroom}</span>
                  </div>
                  <div className="qr-mini-divider"><span>♡</span></div>
                  <div className="qr-mini-box" id="qrMiniBox">
                    <span style={{ fontSize: '1.8rem' }}>⬛</span>
                  </div>
                  <div className="qr-mini-cta">
                    סרקו כדי לתעד רגעים<br />לאלבום המשותף שלנו
                  </div>
                  <div className="qr-mini-subcta">כוונו את המצלמה לקוד למעלה</div>
                  <div className="qr-mini-date" id="qrMiniDate">
                    {dateStr}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="preview-disclaimer">
            <span className="disclaimer-star">✦</span>
            <span>תצוגה להמחשה בלבד — העיצוב הסופי עשוי להיות שונה במעט</span>
          </div>

          <div className="preview-theme-info">
            <div className="current-theme-name" id="previewThemeName">{t.name}</div>
            <div className="current-theme-desc" id="previewThemeDesc">{t.desc || ''}</div>
          </div>
        </div>

      </div>

      {/* TOAST */}
      <div
        id="toast"
        className={`${toast.show ? 'show' : ''} ${toast.type}`.trim()}
      >
        {toast.msg}
      </div>
    </>
  )
}
