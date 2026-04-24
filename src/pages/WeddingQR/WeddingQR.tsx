import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import './WeddingQR.css'
import cameraPhotoImg from '../../assets/CameraPhoto.png'

declare const QRCode: any

const GAS_URL = 'https://znodvoycqqyjohraoaex.supabase.co/functions/v1/api'

const THEMES: Record<string, { rose: string; gold: string; deep: string; blush: string; cream: string }> = {
  classic: { rose: '#c4896f', gold: '#c9a96e', deep: '#3a2820', blush: '#e8c5b0', cream: '#faf6f1' },
  boho: { rose: '#c9956a', gold: '#b07840', deep: '#3d1f10', blush: '#e8c0a0', cream: '#f5ede0' },
  turciz: { rose: '#c9a96e', gold: '#e8c87a', deep: '#f0e0c0', blush: 'rgba(201,169,110,0.4)', cream: '#0d2b2e' },
  floral: { rose: '#c8899e', gold: '#d4a0b5', deep: '#4a1530', blush: '#f0c0d0', cream: '#fdf0f5' },
  minimal: { rose: '#888880', gold: '#a8a8a0', deep: '#2a2a28', blush: '#d8d8d4', cream: '#f8f8f6' },
  sage: { rose: '#4a7c59', gold: '#6b8f71', deep: '#1a3020', blush: '#c0d8c0', cream: '#f0f5f0' },
  navy: { rose: '#7eb8d4', gold: '#4a9bbf', deep: '#e8f4f8', blush: 'rgba(126,184,212,0.2)', cream: '#0d1b2a' },
  blush: { rose: '#e8607a', gold: '#f0a0b0', deep: '#3a1520', blush: '#ffd6de', cream: '#fff0f3' },
  earth: { rose: '#8b6914', gold: '#c9a030', deep: '#2a1a08', blush: '#e8d8b0', cream: '#fdf8ef' },
  lavender: { rose: '#7b4fa0', gold: '#9b72cf', deep: '#2a1040', blush: '#e8daff', cream: '#f8f4ff' },
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

const TEXTURES: Record<string, string> = {
  none: '',
  petals: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(0 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(72 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(144 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(216 20 20)'/%3E%3Cellipse cx='20' cy='10' rx='6' ry='10' fill='none' stroke='%23e8c5b0' stroke-width='1' opacity='.4' transform='rotate(288 20 20)'/%3E%3C/svg%3E")`,
  dots: 'radial-gradient(circle, rgba(201,169,110,0.4) 1px, transparent 1px)',
  grid: 'linear-gradient(rgba(201,169,110,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,.12) 1px, transparent 1px)',
  leaves: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Cpath d='M25,5 Q35,25 25,45 Q15,25 25,5Z' fill='none' stroke='%238a9e8b' stroke-width='1' opacity='.35'/%3E%3Cpath d='M5,25 Q25,15 45,25 Q25,35 5,25Z' fill='none' stroke='%238a9e8b' stroke-width='1' opacity='.25'/%3E%3C/svg%3E")`,
}

function applyTheme(
  theme: string,
  font: string | undefined,
  texture: string | undefined,
  _fontColor: string | undefined,
  fontSize: string | undefined,
  fontWeight: string | undefined
) {
  const t = THEMES[theme] || THEMES.classic
  const r = document.documentElement
  r.style.setProperty('--rose', t.rose)
  r.style.setProperty('--gold', t.gold)
  r.style.setProperty('--deep', t.deep)
  r.style.setProperty('--blush', t.blush)
  r.style.setProperty('--cream', t.cream)
  document.body.style.background = t.cream

  // גופן
  if (font && FONT_FAMILIES[font]) {
    const sizeMap: Record<string, string> = { small: '1.4rem', medium: '2rem', large: '2.6rem', xlarge: '3.2rem' }
    const coupleNames = document.getElementById('coupleNames')
    if (coupleNames) {
      coupleNames.style.fontFamily = FONT_FAMILIES[font]
      coupleNames.style.color = '#3a2820'
      coupleNames.style.fontSize = sizeMap[fontSize ?? ''] || '2.4rem'
      coupleNames.style.fontWeight = fontWeight || '300'
    }
  }
  // טקסטורה
  if (texture && TEXTURES[texture]) {
    document.body.style.backgroundImage = TEXTURES[texture]
    document.body.style.backgroundSize =
      texture === 'dots' ? '18px 18px' : texture === 'grid' ? '20px 20px' : ''
  }
}

export default function WeddingQR() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventID')

  const [coupleNamesHtml, setCoupleNamesHtml] = useState('טוען...')
  const [dateBadge, setDateBadge] = useState('טוען תאריך...')
  const qrContainerRef = useRef<HTMLDivElement>(null)

  const appUrl = eventId
    ? `https://danielg0906.github.io/RegaClick/#/?eventID=${eventId}`
    : 'https://danielg0906.github.io/RegaClick/#/'

  function generateQR(url: string) {
    const container = qrContainerRef.current
    if (!container) return
    container.innerHTML = ''

    // Generate QR into a temp div first
    const temp = document.createElement('div')
    temp.style.position = 'absolute'
    temp.style.visibility = 'hidden'
    temp.style.pointerEvents = 'none'
    document.body.appendChild(temp)

    new QRCode(temp, {
      text: url,
      width: 116,
      height: 116,
      colorDark: '#3a2820',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    })

    setTimeout(() => {
      const qrCanvas = temp.querySelector('canvas') as HTMLCanvasElement | null
      if (!qrCanvas) { document.body.removeChild(temp); return }

      const canvas = document.createElement('canvas')
      canvas.width = 116; canvas.height = 116
      canvas.style.borderRadius = '8px'
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(qrCanvas, 0, 0)

      container.innerHTML = ''
      container.appendChild(canvas)
      document.body.removeChild(temp)
    }, 100)
  }

  useEffect(() => {
    document.title = 'RegaClick - QR'
    async function loadEvent() {
      if (!eventId) {
        setCoupleNamesHtml('<span class="name">שם הכלה</span><span class="amp">&</span><span class="name">שם החתן</span>')
        setDateBadge('תאריך החתונה')
        generateQR(appUrl)
        return
      }
      try {
        const res = await fetch(`${GAS_URL}?action=event&eventID=${eventId}`)
        const data = await res.json()
        if (data.found) {
          const { brideName, groomName, weddingDate, theme } = data.event
          setCoupleNamesHtml(`<span class="name">${brideName}</span><span class="amp">&</span><span class="name">${groomName}</span>`)
          if (weddingDate) {
            const d = new Date(weddingDate + 'T00:00:00')
            const formatted = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
            setDateBadge(`· ${formatted} ·`)
          }
          if (theme) applyTheme(theme, data.event.font, data.event.texture, data.event.fontColor, data.event.fontSize, data.event.fontWeight)
        }
      } catch (e) {
        setCoupleNamesHtml('<span class="name">קרן</span><span class="amp">&</span><span class="name">דניאל</span>')
        setDateBadge('· 26 באוקטובר 2026 ·')
      }
      generateQR(appUrl)
    }

    loadEvent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  return (
    <div className="wedding-qr-container">
      <div className="card" id="card">
        <div
          className="couple"
          id="coupleNames"
          dangerouslySetInnerHTML={{ __html: coupleNamesHtml }}
        />

        <p className="cta">סרקו צלמו ושתפו רגעים מיוחדים לאלבום המשותף שלנו</p>

        <div className="divider"><span>♡</span></div>

        <div className="qr-composite">
          <img src={cameraPhotoImg} className="qr-composite-bg" alt="" aria-hidden="true" />
          <div className="qr-on-wall">
            <div id="qrcode" ref={qrContainerRef}></div>
          </div>
        </div>

        <p className="eternal-text">הפכו את הרגעים היפים של האירוע לזיכרון נצחי</p>

        <div className="date-badge" id="dateBadge">{dateBadge}</div>

        <div className="instagram-credit">
          <svg className="ig-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
          <span>@regaclick</span>
        </div>

      </div>
    </div>
  )
}
