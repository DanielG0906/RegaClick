import { useEffect, useRef, useState } from 'react'
//import { useSearchParams } from 'react-router-dom'
import './GuestUpload.css'

// =============================== CONFIG ==========================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwpYzRO0vSM8eqY8EVos4q9fF6pmVtLXhM6MGoqP3A7gppbq5JiQFsFLkmq8B5wKs_p/exec'
const SUPABASE_URL = 'https://znodvoycqqyjohraoaex.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpub2R2b3ljcXF5am9ocmFvYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDk2NjQsImV4cCI6MjA4ODk4NTY2NH0.1Hx_oI2eDaQEblEW_Jo7z1tpnBeApAl2QMHQKabUmC8'
const BUCKET_NAME = 'wedding-uploads'
// =================================================================================

interface QueueItem {
  id: number
  blob: Blob | null
  type: string
  isVideo: boolean
  dataUrl: string
  thumbnail?: string | null
  status: 'pending' | 'uploading' | 'done' | 'error'
  selected?: boolean
  compressing?: boolean
}

// ── Device Fingerprint — מזהה מכשיר יציב ──
function getDeviceFingerprint(): string {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
const DEVICE_FP = getDeviceFingerprint()

export default function GuestUpload() {
  //const [searchParams] = useSearchParams()
  //const currentEventId = searchParams.get('eventID') || null

  const getEventId = () => {
    const fullUrl = window.location.href;
    const searchParams = new URLSearchParams(fullUrl.split('?')[1]);
    return searchParams.get('eventID') ?? null;
  };

  const currentEventId = getEventId()


  // ── Refs ──
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recIntervalRef = useRef<number | null>(null)
  const recSecondsRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const flipBtnRef = useRef<HTMLButtonElement>(null)
  const userEmailRef = useRef<string>(localStorage.getItem('wedding_email') || sessionStorage.getItem('wedding_email') || '')

  // ── State ──
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [currentMode, setCurrentMode] = useState<'photo' | 'video'>('photo')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('wedding_email') || sessionStorage.getItem('wedding_email') || '')
  void userEmail // used in async callbacks via userEmailRef
  const [isRecording, setIsRecording] = useState(false)
  const [recTimerText, setRecTimerText] = useState('0:00')
  const [recordingLimitReached, setRecordingLimitReached] = useState(false)
  void recordingLimitReached // tracked via recordingLimitReachedRef
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null)
  const [toast, setToast] = useState({ msg: '', type: '', show: false })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showProgressBar, setShowProgressBar] = useState(false)
  const [showLoading, setShowLoading] = useState(true)
  const [loadingHide, setLoadingHide] = useState(false)
  const [errorScreen, setErrorScreen] = useState({ show: false, msg: '' })
  const [errorTitle, setErrorTitle] = useState('הקישור אינו תקין')
  const [errorDesc, setErrorDesc] = useState('נראה שהקישור שסרקת אינו מלא או פג תוקף.\nבקשו מהזוג המאושר לשלוח לכם את הקישור הנכון.')
  const [headerSub, setHeaderSub] = useState('בואו נתעד את הרגעים')
  const [cameraReady, setCameraReady] = useState(false)
  void cameraReady
  const [emailInputVal, setEmailInputVal] = useState('')
  const [emailInputError, setEmailInputError] = useState(false)
  const [brideName, setBrideName] = useState('שם הכלה')
  const [groomName, setGroomName] = useState('שם החתן')
  const [coupleAmpStyle, setCoupleAmpStyle] = useState<React.CSSProperties>({})
  const [brideNameStyle, setBrideNameStyle] = useState<React.CSSProperties>({})
  const [groomNameStyle, setGroomNameStyle] = useState<React.CSSProperties>({})
  const [showEmailNudge, setShowEmailNudge] = useState(true)
  const [shutterDisabled, setShutterDisabled] = useState(false)
  const [shutterStyle, setShutterStyle] = useState<React.CSSProperties>({})
  const [selectModeBtnHidden, setSelectModeBtnHidden] = useState(false)
  const [uploadAllBtnHidden, setUploadAllBtnHidden] = useState(false)
  const [cameraPlaceholderText, setCameraPlaceholderText] = useState('לחץ להפעלת המצלמה')
  const [showCameraPlaceholder, setShowCameraPlaceholder] = useState(true)
  const [isFlashing, setIsFlashing] = useState(false)
  const [flipBtnHidden, setFlipBtnHidden] = useState(false)
  const [shutterBorderColor, setShutterBorderColor] = useState('')

  // refs for mutable values used inside async callbacks
  const facingModeRef = useRef<'user' | 'environment'>('environment')
  const currentModeRef = useRef<'photo' | 'video'>('photo')
  const queueRef = useRef<QueueItem[]>([])
  const selectModeRef = useRef(false)
  const selectedIdsRef = useRef<Set<number>>(new Set())
  const recordingLimitReachedRef = useRef(false)

  // keep refs in sync
  useEffect(() => { facingModeRef.current = facingMode }, [facingMode])
  useEffect(() => { currentModeRef.current = currentMode }, [currentMode])
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { selectModeRef.current = selectMode }, [selectMode])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])

  // ── Toast ──
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string, type = '') {
    setToast({ msg, type, show: true })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  function showMsg(msg: string, _type = '') {
    setToast({ msg, type: 'permanent', show: true })
  }

  // ── Loading ──
  function hideLoading() {
    setLoadingHide(true)
    setTimeout(() => setShowLoading(false), 500)
  }

  // ── applyTheme ──
  function applyTheme(
    theme: string,
    font?: string,
    texture?: string,
    fontColor?: string,
    fontSize?: string,
    fontWeight?: string
  ) {
    const themes: Record<string, string[]> = {
      classic: ['#faf6f1', '#c4896f', '#c9a96e', '#3a2820', '#e8c5b0'],
      boho: ['#f5ede0', '#c9956a', '#b07840', '#3d1f10', '#e8c0a0'],
      turciz: ['#0d2b2e', '#c9a96e', '#e8c87a', '#f0e0c0', 'rgba(201,169,110,0.3)'],
      gold: ['#0d2b2e', '#c9a96e', '#e8c87a', '#f0e0c0', 'rgba(201,169,110,0.3)'],
      floral: ['#fdf0f5', '#c8899e', '#d4a0b5', '#4a1530', '#f0c0d0'],
      minimal: ['#f8f8f6', '#888880', '#a8a8a0', '#2a2a28', '#d8d8d4'],
      sage: ['#f0f5f0', '#4a7c59', '#6b8f71', '#1a3020', '#c0d8c0'],
      navy: ['#0d1b2a', '#7eb8d4', '#4a9bbf', '#e8f4f8', 'rgba(126,184,212,0.2)'],
      blush: ['#fff0f3', '#e8607a', '#f0a0b0', '#3a1520', '#ffd6de'],
      earth: ['#fdf8ef', '#8b6914', '#c9a030', '#2a1a08', '#e8d8b0'],
      lavender: ['#f8f4ff', '#7b4fa0', '#9b72cf', '#2a1040', '#e8daff'],
    }
    const fontFamilies: Record<string, string> = {
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
    const textures: Record<string, string> = {
      none: '',
      petals: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Cellipse cx=\'20\' cy=\'10\' rx=\'6\' ry=\'10\' fill=\'none\' stroke=\'%23e8c5b0\' stroke-width=\'1\' opacity=\'.4\' transform=\'rotate(0 20 20)\'/%3E%3Cellipse cx=\'20\' cy=\'10\' rx=\'6\' ry=\'10\' fill=\'none\' stroke=\'%23e8c5b0\' stroke-width=\'1\' opacity=\'.4\' transform=\'rotate(72 20 20)\'/%3E%3Cellipse cx=\'20\' cy=\'10\' rx=\'6\' ry=\'10\' fill=\'none\' stroke=\'%23e8c5b0\' stroke-width=\'1\' opacity=\'.4\' transform=\'rotate(144 20 20)\'/%3E%3Cellipse cx=\'20\' cy=\'10\' rx=\'6\' ry=\'10\' fill=\'none\' stroke=\'%23e8c5b0\' stroke-width=\'1\' opacity=\'.4\' transform=\'rotate(216 20 20)\'/%3E%3Cellipse cx=\'20\' cy=\'10\' rx=\'6\' ry=\'10\' fill=\'none\' stroke=\'%23e8c5b0\' stroke-width=\'1\' opacity=\'.4\' transform=\'rotate(288 20 20)\'/%3E%3C/svg%3E")',
      dots: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
      grid: 'linear-gradient(rgba(201,169,110,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,.12) 1px, transparent 1px)',
      leaves: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Cpath d=\'M25,5 Q35,25 25,45 Q15,25 25,5Z\' fill=\'none\' stroke=\'%238a9e8b\' stroke-width=\'1\' opacity=\'.35\'/%3E%3Cpath d=\'M5,25 Q25,15 45,25 Q25,35 5,25Z\' fill=\'none\' stroke=\'%238a9e8b\' stroke-width=\'1\' opacity=\'.25\'/%3E%3C/svg%3E")',
    }
    const t = themes[theme] || themes.classic
    const r = document.documentElement;
    (['--cream', '--rose', '--gold', '--deep', '--blush'] as const).forEach((v, i) => r.style.setProperty(v, t[i]))
    if (font && fontFamilies[font]) {
      const sizeMap: Record<string, string> = { small: '1.4rem', medium: '2rem', large: '2.6rem', xlarge: '3.2rem' }
      const nameStyle: React.CSSProperties = {
        fontFamily: fontFamilies[font],
        color: fontColor || '#3a2820',
        fontSize: sizeMap[fontSize || ''] || '2rem',
        fontWeight: fontWeight || '400',
      }
      setBrideNameStyle(nameStyle)
      setGroomNameStyle(nameStyle)
      setCoupleAmpStyle({
        fontFamily: fontFamilies[font],
        color: t[1],
        fontSize: sizeMap[fontSize || ''] || '2rem',
        fontWeight: fontWeight || '400',
      })
    }
    if (texture && textures[texture]) {
      document.body.style.backgroundImage = textures[texture]
      if (texture === 'dots') document.body.style.backgroundSize = '18px 18px'
      else if (texture === 'grid') document.body.style.backgroundSize = '20px 20px'
      else document.body.style.backgroundSize = ''
    }
  }

  // ── startCamera ──
  async function startCamera(fm?: 'user' | 'environment', mode?: 'photo' | 'video') {
    const fMode = fm ?? facingModeRef.current
    const cMode = mode ?? currentModeRef.current
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: fMode,
          width: { ideal: cMode === 'video' ? 1280 : 1920 },
          height: { ideal: cMode === 'video' ? 720 : 1080 },
        },
        audio: cMode === 'video',
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => { })
      }
      setShowCameraPlaceholder(false)
      setCameraReady(true)
    } catch (_e) {
      setShowCameraPlaceholder(true)
      setCameraPlaceholderText('הגישה למצלמה נדחתה')
      showToast('יש לאפשר גישה למצלמה בהגדרות', 'error')
    }
  }

  function flipCamera() {
    const next: 'user' | 'environment' = facingModeRef.current === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    facingModeRef.current = next
    startCamera(next, currentModeRef.current)
  }

  function setMode(mode: 'photo' | 'video') {
    setCurrentMode(mode)
    currentModeRef.current = mode
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') stopRecording()
    startCamera(facingModeRef.current, mode)
  }

  function captureOrRecord() {
    if (currentModeRef.current === 'photo') {
      capturePhoto()
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') stopRecording()
      else startRecording()
    }
  }

  function capturePhoto() {
    const vid = videoRef.current
    if (!streamRef.current) return showToast('יש להפעיל את המצלמה קודם', 'error')
    if (queueRef.current.filter(i => i.status !== 'done').length >= 20) {
      showToast('ניתן לשתף עד 20 תמונות/סרטונים בפעם אחת 📸', 'error')
      return
    }

    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 200)

    const FULL_MAX = 2400
    let fw = (vid?.videoWidth) || 1280
    let fh = (vid?.videoHeight) || 960
    if (fw > FULL_MAX) { fh = Math.round(fh * FULL_MAX / fw); fw = FULL_MAX }
    const shotCanvas = document.createElement('canvas')
    shotCanvas.width = fw; shotCanvas.height = fh
    const sCtx = shotCanvas.getContext('2d')!
    if (facingModeRef.current === 'user') { sCtx.translate(fw, 0); sCtx.scale(-1, 1) }
    sCtx.drawImage(vid!, 0, 0, fw, fh)

    // preview thumb
    const previewCanvas = document.createElement('canvas')
    const PREV_MAX = 400
    let pw = fw, ph = fh
    if (pw > PREV_MAX) { ph = Math.round(ph * PREV_MAX / pw); pw = PREV_MAX }
    previewCanvas.width = pw; previewCanvas.height = ph
    previewCanvas.getContext('2d')!.drawImage(shotCanvas, 0, 0, pw, ph)
    const previewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.6)

    const id = Date.now() + Math.random()
    const newItem: QueueItem = { id, blob: null, type: 'image/jpeg', dataUrl: previewDataUrl, status: 'pending', isVideo: false, compressing: true }
    setQueue(prev => {
      const next = [...prev, newItem]
      queueRef.current = next
      return next
    })
    showToast('נוסף לאלבום ✓', 'success')

    // full compression in background
    setTimeout(() => {
      const supportsWebP = shotCanvas.toDataURL('image/webp').startsWith('data:image/webp')
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg'
      shotCanvas.toBlob(blob => {
        if (!blob) return
        setQueue(prev => {
          const next = prev.map(item => {
            if (item.id === id) {
              return {
                ...item,
                blob,
                type: mimeType,
                dataUrl: shotCanvas.toDataURL(mimeType, 0.93),
                compressing: false,
              }
            }
            return item
          })
          queueRef.current = next
          return next
        })
      }, mimeType, 0.93)
    }, 50)
  }

  function startRecording() {
    if (!streamRef.current) return showToast('יש להפעיל את המצלמה קודם', 'error')
    if (queueRef.current.filter(i => i.status !== 'done').length >= 20) {
      showToast('ניתן לשתף עד 20 תמונות/סרטונים בפעם אחת — שתף את הקיימות ואז צלם עוד 📸', 'error')
      return
    }
    recordedChunksRef.current = []
    const opts = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 3200000 }
      : { mimeType: 'video/webm', videoBitsPerSecond: 4000000 }
    const mr = new MediaRecorder(streamRef.current, opts)
    mediaRecorderRef.current = mr
    mr.ondataavailable = e => { if (e.data.size) recordedChunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const tmpVid = document.createElement('video')
      tmpVid.src = url
      tmpVid.muted = true
      tmpVid.playsInline = true
      tmpVid.currentTime = 0.1
      tmpVid.addEventListener('seeked', () => {
        const c = document.createElement('canvas')
        c.width = tmpVid.videoWidth; c.height = tmpVid.videoHeight
        c.getContext('2d')!.drawImage(tmpVid, 0, 0)
        const thumbnail = c.toDataURL('image/jpeg', 0.7)
        addToQueue(blob, 'video/webm', url, true, thumbnail)
        if (recordingLimitReachedRef.current) {
          showToast('הסרטון נשמר — הגעת למגבלת 30 שניות 🎬', 'success')
          recordingLimitReachedRef.current = false
          setRecordingLimitReached(false)
        }
      }, { once: true })
      tmpVid.load()
    }
    mr.start(100)
    setIsRecording(true)
    setShutterBorderColor('#b44040')
    setFlipBtnHidden(true)
    recSecondsRef.current = 0
    setRecTimerText('0:00')
    if (recIntervalRef.current) clearInterval(recIntervalRef.current)
    recIntervalRef.current = window.setInterval(() => {
      recSecondsRef.current++
      const s = recSecondsRef.current
      const m = Math.floor(s / 60), sec = s % 60
      setRecTimerText(`${m}:${sec.toString().padStart(2, '0')}`)
      if (s >= 30) {
        recordingLimitReachedRef.current = true
        setRecordingLimitReached(true)
        stopRecording()
      }
    }, 1000)
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recIntervalRef.current) clearInterval(recIntervalRef.current)
    setIsRecording(false)
    setShutterBorderColor('')
    setFlipBtnHidden(false)
  }

  function addToQueue(blob: Blob, type: string, dataUrl: string, isVideo = false, thumbnail: string | null = null) {
    const id = Date.now() + Math.random()
    const newItem: QueueItem = { id, blob, type, dataUrl, thumbnail, status: 'pending', isVideo }
    setQueue(prev => {
      const next = [...prev, newItem]
      queueRef.current = next
      return next
    })
    showToast('נוסף לאלבום ✓', 'success')
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const r = new FileReader()
      r.onload = ev => addToQueue(file, file.type, ev.target?.result as string)
      r.readAsDataURL(file)
    })
    e.target.value = ''
  }

  // ── checkDateLock ──
  async function checkDateLock(weddingDate: string, eventId: string) {
    if (!weddingDate || !eventId) return
    let allowed = true
    let expired = false
    let serverWeddingDate = weddingDate
    try {
      const res = await fetch(`${GAS_URL}?action=checkDate&eventID=${eventId}`)
      const data = await res.json()
      allowed = data.allowed
      expired = data.expired || false
      if (data.weddingDate) serverWeddingDate = data.weddingDate
    } catch (_err) {
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' })
      allowed = todayStr === weddingDate
    }

    if (expired) {
      setShowLoading(false)
      setErrorTitle('האירוע הסתיים')
      setErrorDesc('הקישור לאלבום הזה כבר לא פעיל. תודה שהיית חלק מהרגע! 💕')
      setErrorScreen({ show: true, msg: '' })
      return
    }
    if (!allowed) {
      lockCamera(serverWeddingDate)
    }
  }

  function lockCamera(weddingDate: string) {
    setShutterDisabled(true)
    setShutterStyle({ opacity: '0.35', cursor: 'not-allowed' } as React.CSSProperties)
    setSelectModeBtnHidden(true)
    setUploadAllBtnHidden(true)
    const d = new Date(weddingDate + 'T00:00:00')
    const formatted = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
    showMsg('האפליקציה תהיה פעילה רק ביום החתונה · ' + formatted, '')
  }

  // ── loadEventData ──
  async function loadEventData(eventId: string) {
    try {
      const res = await fetch(GAS_URL + '?action=event&eventID=' + eventId)
      const data = await res.json()
      if (!data.found) { hideLoading(); setErrorScreen({ show: true, msg: '' }); return }
      const { brideName: bn, groomName: gn, weddingDate, theme } = data.event
      if (bn && gn) {
        setBrideName(bn)
        setGroomName(gn)
      }
      await checkDateLock(weddingDate, eventId)
      if (weddingDate) {
        const d = new Date(weddingDate + 'T00:00:00')
        setHeaderSub(
          d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · בואו נתעד את הרגעים'
        )
      }
      if (theme) applyTheme(theme, data.event.font, data.event.texture, data.event.fontColor, data.event.fontSize, data.event.fontWeight)

      // אם אין מייל שמור — נסה לשלוף מ-GAS לפי fingerprint
      if (!userEmailRef.current) {
        try {
          const er = await fetch(`${GAS_URL}?action=getEmail&fp=${DEVICE_FP}&eventID=${eventId}`, { redirect: 'follow' })
          const ed = await er.json()
          console.log('[RegaClick] getEmail fp=' + DEVICE_FP, ed)
          if (ed.found && ed.email) {
            userEmailRef.current = ed.email
            setUserEmail(ed.email)
            localStorage.setItem('wedding_email', ed.email)
            sessionStorage.setItem('wedding_email', ed.email)
            setShowEmailNudge(false)
            showToast('שמחים שחזרת אלינו! ' + ed.email + ' 💌', 'success')
          } else if (!localStorage.getItem('wedding_email_asked')) {
            setTimeout(() => setShowEmailModal(true), 600)
          }
        } catch (_err) {
          if (!localStorage.getItem('wedding_email_asked')) setTimeout(() => setShowEmailModal(true), 600)
        }
      }

      hideLoading()
    } catch (_e) { hideLoading() }
  }

  // ── init ──
  useEffect(() => {
    document.title = 'RegaClick'
    startCamera('environment', 'photo')
    if (userEmailRef.current) {
      setShowEmailNudge(false)
      setTimeout(() => showToast('שמחים שחזרת אלינו!  ' + userEmailRef.current + ' 💌', 'success'), 1500)
    }
    if (currentEventId) {
      loadEventData(currentEventId)
    } else {
      setShowLoading(false)
      setErrorScreen({ show: true, msg: '' })
    }
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (recIntervalRef.current) clearInterval(recIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── uploadToSupabase ──
  async function uploadToSupabase(blob: Blob, filename: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filename}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY,
            'Content-Type': blob.type || 'application/octet-stream',
            'x-upsert': 'true',
          },
          body: blob,
        }
      )
      return res.ok
    } catch (_e) {
      return false
    }
  }

  async function uploadItem(item: QueueItem): Promise<boolean> {
    try {
      if (item.compressing || !item.blob) {
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 100))
          // re-read from ref since state may have updated
          const fresh = queueRef.current.find(q => q.id === item.id)
          if (fresh && !fresh.compressing && fresh.blob) {
            item = fresh
            break
          }
        }
      }
      if (!item.blob) return false
      const ext = item.type.includes('video') ? 'webm' : item.type.includes('webp') ? 'webp' : 'jpg'
      const folder = currentEventId || 'general'
      const userPrefix = userEmailRef.current ? userEmailRef.current.split('@')[0] + '_' : ''
      const filename = `${folder}/${userPrefix}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      return await uploadToSupabase(item.blob, filename)
    } catch (e) {
      console.error('Upload failed:', e)
      return false
    }
  }

  async function uploadAll() {
    const pending = queueRef.current.filter(i => i.status === 'pending' || i.status === 'error')
    if (!pending.length) return showToast('אין מה להעלות', 'error')
    setIsUploading(true)
    setShowProgressBar(true)
    setUploadProgress(5)
    setQueue(prev => {
      const next = prev.map(i => pending.find(p => p.id === i.id) ? { ...i, status: 'uploading' as const } : i)
      queueRef.current = next
      return next
    })
    const results: boolean[] = []
    for (const item of pending) {
      const ok = await uploadItem(item)
      results.push(ok)
      setQueue(prev => {
        const next = prev.map(i => i.id === item.id ? { ...i, status: ok ? 'done' as const : 'error' as const } : i)
        queueRef.current = next
        return next
      })
      setUploadProgress(Math.round((results.length / pending.length) * 100))
    }
    setShowProgressBar(false)
    setUploadProgress(0)
    setIsUploading(false)
    const errors = results.filter(r => !r).length
    if (errors) showToast(`${results.length - errors} הועלו · ${errors} נכשלו`, 'error')
    else showToast(`${results.length} קבצים שותפו! 💕`, 'success')
    setTimeout(() => {
      setQueue(prev => {
        const next = prev.filter(i => i.status !== 'done')
        queueRef.current = next
        return next
      })
    }, 2500)
  }

  // ── Select mode ──
  function toggleSelectMode() {
    const next = !selectModeRef.current
    setSelectMode(next)
    selectModeRef.current = next
    setSelectedIds(new Set())
    selectedIdsRef.current = new Set()
  }

  function toggleSelectItem(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      selectedIdsRef.current = next
      return next
    })
  }

  async function shareSelected() {
    const selected = queueRef.current.filter(i => selectedIdsRef.current.has(i.id) && (i.status === 'pending' || i.status === 'error'))
    if (!selected.length) return
    setQueue(prev => {
      const next = prev.map(i => selected.find(s => s.id === i.id) ? { ...i, status: 'uploading' as const } : i)
      queueRef.current = next
      return next
    })
    const results = await Promise.all(selected.map(item => uploadItem(item)))
    results.forEach((ok, i) => {
      setQueue(prev => {
        const next = prev.map(qi => qi.id === selected[i].id ? { ...qi, status: ok ? 'done' as const : 'error' as const } : qi)
        queueRef.current = next
        return next
      })
    })
    setSelectedIds(new Set())
    selectedIdsRef.current = new Set()
    toggleSelectMode()
    const errors = results.filter(r => !r).length
    if (errors) showToast(`${results.length - errors} הועלו · ${errors} נכשלו`, 'error')
    else showToast(`${results.length} קבצים שותפו! 💕`, 'success')
    setTimeout(() => {
      setQueue(prev => {
        const next = prev.filter(i => i.status !== 'done')
        queueRef.current = next
        return next
      })
    }, 2500)
  }

  function deleteSelected() {
    const idsToDelete = new Set(selectedIdsRef.current)   // snapshot לפני ניקוי
    const count = idsToDelete.size
    setQueue(prev => {
      const next = prev.filter(i => !idsToDelete.has(i.id))
      queueRef.current = next
      return next
    })
    setSelectedIds(new Set())
    selectedIdsRef.current = new Set()
    toggleSelectMode()
    showToast(count + ' תמונות הוסרו', '')
  }

  // ── Photo preview ──
  function previewQueueItem(id: number) {
    const item = queueRef.current.find(q => q.id === id)
    if (!item) return
    setPreviewItem(item)
    setShowPhotoPreview(true)
  }

  function closePhotoPreview() {
    setShowPhotoPreview(false)
    setPreviewItem(null)
  }

  function discardPreviewItem() {
    if (!previewItem) return
    setQueue(prev => {
      const next = prev.filter(q => q.id !== previewItem.id)
      queueRef.current = next
      return next
    })
    closePhotoPreview()
    showToast('הוסר מהאלבום', '')
  }

  // ── Email modal ──
  function openEmailModal() {
    setEmailInputVal(userEmailRef.current || '')
    setShowEmailModal(true)
  }

  function closeEmailModal() {
    setShowEmailModal(false)
    localStorage.setItem('wedding_email_asked', '1')
  }

  function saveEmail() {
    const val = emailInputVal.trim()
    if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      userEmailRef.current = val
      setUserEmail(val)
      localStorage.setItem('wedding_email', val)
      sessionStorage.setItem('wedding_email', val)
      fetch(GAS_URL, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ action: 'saveEmail', fingerprint: DEVICE_FP, email: val, eventId: currentEventId || '' })
      })
      closeEmailModal()
      setShowEmailNudge(false)
      showToast('המייל נשמר 💌', 'success')
    } else {
      setEmailInputError(true)
      setTimeout(() => setEmailInputError(false), 1500)
    }
  }

  // ── Queue item click handler ──
  function handleQueueItemClick(item: QueueItem) {
    if (selectMode) {
      if (item.status !== 'pending' && item.status !== 'error') return
      if (item.status === 'error') {
        setQueue(prev => {
          const next = prev.map(q => q.id === item.id ? { ...q, status: 'pending' as const } : q)
          queueRef.current = next
          return next
        })
      }
      toggleSelectItem(item.id)
    } else {
      if (item.status === 'pending' || item.status === 'error') previewQueueItem(item.id)
    }
  }

  const pendingCount = queue.filter(i => i.status !== 'done').length
  const selectedCount = selectedIds.size

  return (
    <>
      {/* Error Screen */}
      <div id="errorScreen" className={errorScreen.show ? 'show' : ''}>
        <div className="error-icon">💔</div>
        <div className="error-title">{errorTitle}</div>
        <div className="error-desc">{errorDesc}</div>
      </div>

      {/* Loading Screen */}
      {showLoading && (
        <div id="loadingScreen" className={loadingHide ? 'hide' : ''}>
          <div className="loading-heart">💕</div>
          <div className="loading-text">טוענים את האירוע<span className="loading-dots"></span></div>
        </div>
      )}

      {/* Photo Preview Modal */}
      <div
        id="photoPreviewModal"
        className={showPhotoPreview ? 'show' : ''}
        onClick={e => { if (e.target === e.currentTarget) closePhotoPreview() }}
      >
        {previewItem && (
          <>
            {previewItem.isVideo ? (
              <video
                className="photo-preview-video"
                src={previewItem.dataUrl}
                controls
                playsInline
                autoPlay
              />
            ) : (
              <img
                className="photo-preview-img"
                id="photoPreviewImg"
                src={previewItem.dataUrl}
                alt="תצוגה מקדימה"
              />
            )}
          </>
        )}
        <div className="photo-preview-actions">
          <button className="preview-action-btn preview-btn-discard" id="previewDiscardBtn" onClick={discardPreviewItem}>🗑 מחק</button>
          <button className="preview-action-btn preview-btn-keep" onClick={closePhotoPreview}>← חזרה</button>
        </div>
      </div>

      <div className="app">
        <header>
          <div className="couple-names" id="coupleNames">
            <span id="brideName-display" style={brideNameStyle}>{brideName}</span>
            <div className="couple-amp" id="couple-amp" style={coupleAmpStyle}>&amp;</div>
            <span id="groomName-display" style={groomNameStyle}>{groomName}</span>
          </div>
          <div className="header-divider">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
          <p className="header-sub">{headerSub}</p>
        </header>

        <div className="mode-toggle">
          <button
            className={`mode-btn${currentMode === 'photo' ? ' active' : ''}`}
            id="photoModeBtn"
            onClick={() => setMode('photo')}
          >📷 תמונה</button>
          <button
            className={`mode-btn${currentMode === 'video' ? ' active' : ''}`}
            id="videoModeBtn"
            onClick={() => setMode('video')}
          >🎬 וידאו</button>
        </div>

        <div className="camera-wrap">
          <video
            id="videoEl"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={facingMode === 'user' ? 'mirrored' : ''}
          />
          <div className="camera-overlay" />
          <div className="corner-br" />
          <div className="corner-tr" />
          {showCameraPlaceholder && (
            <div className="camera-placeholder" id="cameraPlaceholder">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p>{cameraPlaceholderText}</p>
            </div>
          )}
          <div className={`flash-overlay${isFlashing ? ' flash' : ''}`} id="flashOverlay" />
          <div
            className="rec-indicator"
            id="recIndicator"
            style={{ display: isRecording ? 'flex' : 'none' }}
          >
            <div className="rec-dot" />
            <span id="recTimer">{recTimerText}</span>
          </div>
        </div>

        <div className="controls">
          <button
            className="ctrl-btn"
            ref={flipBtnRef}
            style={{ visibility: flipBtnHidden ? 'hidden' : 'visible' }}
            onClick={flipCamera}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            הפוך
          </button>
          <button
            className="shutter-btn"
            id="shutterBtn"
            disabled={shutterDisabled}
            style={{ ...shutterStyle, ...(shutterBorderColor ? { borderColor: shutterBorderColor } : {}) }}
            onClick={captureOrRecord}
          />
          <div />
        </div>

        <div className={`progress-bar-wrap${showProgressBar ? ' active' : ''}`} id="progressWrap">
          <div className="progress-bar" id="progressBar" style={{ width: uploadProgress + '%' }} />
        </div>

        <div className="queue-section">
          <div className="queue-header">
            <span className="queue-label">האלבום שלי (<span id="queueCount">{pendingCount}</span>)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!selectMode && !selectModeBtnHidden && (
                <button
                  id="selectModeBtn"
                  onClick={toggleSelectMode}
                  style={{ background: 'linear-gradient(135deg,var(--rose),var(--gold))', color: 'white', padding: '7px 14px', borderRadius: '14px', fontSize: '0.72rem', border: 'none', fontFamily: "'Jost',sans-serif", cursor: 'pointer', boxShadow: '0 3px 12px rgba(196,137,111,0.3)' }}
                >בחר</button>
              )}
              {!selectMode && !uploadAllBtnHidden && (
                <button
                  className="upload-all-btn"
                  id="uploadAllBtn"
                  onClick={uploadAll}
                  disabled={isUploading}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {isUploading ? <><span className="spinner" /> משתף…</> : 'שתף הכל'}
                </button>
              )}
            </div>
          </div>

          <div className={`select-bar${selectMode ? ' visible' : ''}`} id="selectBar">
            <button className="select-bar-btn select-bar-cancel" onClick={toggleSelectMode}>ביטול</button>
            <button
              className="select-bar-btn select-bar-delete"
              id="selectDeleteBtn"
              onClick={deleteSelected}
              disabled={selectedCount === 0}
            >🗑 הסר{selectedCount > 0 ? ` (${selectedCount})` : ''}</button>
            <button
              className="select-bar-btn select-bar-share"
              id="selectShareBtn"
              onClick={shareSelected}
              disabled={selectedCount === 0}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              שתף{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>

          <div className={`queue-grid${selectMode ? ' select-mode' : ''}`} id="queueGrid">
            {queue.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>צלמו תמונות ויצטרפו לאלבום ✨</div>
            ) : (
              queue.map(item => (
                <div
                  key={item.id}
                  className={`queue-item${selectedIds.has(item.id) ? ' selected' : ''}`}
                  onClick={() => handleQueueItemClick(item)}
                >
                  {item.isVideo ? (
                    <>
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(180,40,40,0.85)', color: 'white', borderRadius: '10px', padding: '2px 7px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 1 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                        וידאו
                      </div>
                      {item.thumbnail
                        ? <img src={item.thumbnail} alt="" />
                        : <video src={item.dataUrl} preload="metadata" muted playsInline />
                      }
                    </>
                  ) : (
                    <img src={item.dataUrl} alt="" />
                  )}
                  <div className="select-circle" />
                  {item.status === 'uploading' && (
                    <div className="queue-status uploading">
                      <div className="spinner" />
                    </div>
                  )}
                  {item.status === 'done' && (
                    <div className="queue-status done">✓</div>
                  )}
                  {item.status === 'error' && (
                    <div
                      className="queue-status error"
                      onClick={e => {
                        e.stopPropagation()
                        setQueue(prev => {
                          const next = prev.map(q => q.id === item.id ? { ...q, status: 'pending' as const } : q)
                          queueRef.current = next
                          return next
                        })
                        showToast('מוכן להעלאה מחדש', '')
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '1.2rem' }}>✗</span>
                        <span style={{ fontSize: '0.55rem', letterSpacing: '0.04em', opacity: 0.9 }}>לחץ לניסיון חוזר</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {showEmailNudge && (
            <div className="email-nudge" id="emailNudge">
              <div className="email-nudge-icon">💌</div>
              <div className="email-nudge-text">
                <div className="email-nudge-title">רוצה לקבל מחר את כל התמונות והסרטונים מהחגיגה למייל?</div>
              </div>
              <button className="email-nudge-btn" onClick={openEmailModal}>הזינו כאן את המייל  ✉️</button>
            </div>
          )}
        </div>
      </div>

      <div
        id="toast"
        className={`${toast.show ? 'show' : ''} ${toast.type}`.trim()}
      >{toast.msg}</div>
      <input type="file" id="fileInput" accept="image/*,video/*" multiple onChange={handleFileInput} />

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="modal-backdrop"
          id="emailModal"
          onClick={e => { if (e.target === e.currentTarget) closeEmailModal() }}
        >
          <div className="modal-card">
            <button className="modal-close" onClick={closeEmailModal}>✕</button>
            <div className="modal-icon">💌</div>
            <div className="modal-title">רוצה לקבל מחר את כל התמונות והסרטונים מהחגיגה למייל?</div>
            <p className="modal-desc">הזינו מייל ונדאג שכל התמונות והסרטונים שצולמו כאן היום יחכו לכם מחר בתיבת הדואר שלכם.</p>
            <div className="email-input-wrap">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                className="email-input"
                type="email"
                id="emailInput"
                placeholder="your@email.com"
                autoComplete="email"
                value={emailInputVal}
                onChange={e => setEmailInputVal(e.target.value)}
                style={emailInputError ? { borderColor: '#b44040' } : {}}
              />
            </div>
            <button className="modal-submit" onClick={saveEmail}>שמור והתחל לצלם 📸</button>
            <button className="modal-skip" onClick={closeEmailModal}>דלג בינתיים</button>
          </div>
        </div>
      )}
    </>
  )
}
