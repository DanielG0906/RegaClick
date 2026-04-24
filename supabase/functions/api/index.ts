// RegaClick — Supabase Edge Function
// Replaces: setup-portal-gas.gs (Google Apps Script)
//
// Deploy: supabase functions deploy api
// Secrets: supabase secrets set RESEND_API_KEY=re_... SENDER_EMAIL=you@domain.com UPLOAD_SECRET=vQ8$kX#2mP@9wL!4nR&zT6*jF

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Row = Record<string, unknown>

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function db() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ════════════════════════════════════════════════════════
//  Router
// ════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const client = db()
  const url = new URL(req.url)
  const p = Object.fromEntries(url.searchParams)

  try {
    if (req.method === 'GET') {
      const { action, email, eventID, fp } = p
      if (action === 'sendOTP'   && email)   return await handleSendOTP(client, email)
      if (action === 'verifyOTP' && email)   return await handleVerifyOTP(client, email, p.otp)
      if (action === 'lookup'    && email)   return await handleLookup(client, email)
      if (action === 'event'     && eventID) return await handleEventLookup(client, eventID)
      if (action === 'getEmail'  && fp)      return await handleGetEmail(client, fp)
      if (action === 'checkDate' && eventID) return await handleCheckDate(client, eventID)
      return json({ status: 'ok', service: 'RegaClick Backend' })
    }

    if (req.method === 'POST') {
      const payload: Row = await req.json()
      if (payload.action === 'save')      return await handleSave(client, payload)
      if (payload.action === 'saveEmail') return await handleSaveEmail(client, payload)
      return json({ success: false, error: 'Unknown action' })
    }

    return json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    return json({ success: false, error: String(err) })
  }
})

// ════════════════════════════════════════════════════════
//  Handlers
// ════════════════════════════════════════════════════════

async function handleLookup(client: SupabaseClient, email: string) {
  const { data } = await client.from('couples').select('*').ilike('email', email).maybeSingle()
  if (!data) return json({ found: false })
  return json({ found: true, record: formatCouple(data) })
}

async function handleEventLookup(client: SupabaseClient, eventId: string) {
  const { data } = await client.from('couples').select('*').eq('event_id', eventId).maybeSingle()
  if (!data) return json({ found: false })
  const { email: _e, ...eventFields } = formatCouple(data)
  return json({ found: true, event: eventFields })
}

async function handleSave(client: SupabaseClient, payload: Row) {
  const { email, brideName, groomName, weddingDate, theme, font, texture,
          fontColor, fontSize, fontWeight, eventId } = payload as Record<string, string>

  if (!email || !brideName || !groomName || !weddingDate)
    return json({ success: false, error: 'חסרים שדות חובה' })

  const hoursUntil = (new Date(weddingDate + 'T00:00:00').getTime() - Date.now()) / 3_600_000
  if (hoursUntil <= 24)
    return json({ success: false, error: 'האירוע נעול — פחות מ-24 שעות לחתונה' })

  const { data: existing } = await client
    .from('couples').select('event_id').ilike('email', email).maybeSingle()

  const newId = existing?.event_id ?? eventId ?? generateEventId()

  const record = {
    email,
    bride_name:  brideName,
    groom_name:  groomName,
    wedding_date: weddingDate,
    theme,
    font:        font        || 'cormorant',
    texture:     texture     || 'none',
    font_color:  fontColor   || '#3a2820',
    font_size:   fontSize    || 'medium',
    font_weight: fontWeight  || '400',
    event_id:    newId,
    folder_id:   newId,
    updated_at:  new Date().toISOString(),
  }

  const { error } = await client.from('couples').upsert(record, { onConflict: 'email' })
  if (error) return json({ success: false, error: error.message })

  return json({ success: true, action: existing ? 'updated' : 'created', eventId: newId, folderId: newId })
}

async function handleSendOTP(client: SupabaseClient, email: string) {
  const now = Date.now()
  const HALF_MIN = 45_000

  const { data: existing } = await client
    .from('otp').select('last_sent').ilike('email', email)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (existing && now - Number(existing.last_sent) < HALF_MIN)
    return json({ sent: false, error: 'מייל כבר נשלח אליך. ניתן יהיה לבקש שליחה חוזרת בעוד מספר רגעים.' })

  await client.from('otp').delete().ilike('email', email)

  const otp = String(Math.floor(100_000 + Math.random() * 900_000))
  await client.from('otp').insert({ email, otp, expiry: now + 10 * 60_000, used: false, last_sent: now })

  const resendKey   = Deno.env.get('RESEND_API_KEY')
  const senderEmail = Deno.env.get('SENDER_EMAIL') ?? 'noreply@regaclick.com'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `RegaClick <${senderEmail}>`,
      to: [email],
      subject: 'RegaClick — קוד האימות שלך 💕',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:40px;background:#faf6f1;border-radius:20px">
          <h2 style="font-family:Georgia,serif;color:#3a2820;font-style:italic;margin-bottom:8px">קוד האימות שלך</h2>
          <p style="color:#8a7060;margin-bottom:24px">הכניסו את הקוד הבא בדף ההגדרות:</p>
          <div style="font-size:2.8rem;font-weight:bold;letter-spacing:.3em;color:#c4896f;text-align:center;padding:24px;background:white;border-radius:14px;border:2px solid #e8c5b0">${otp}</div>
          <p style="color:#a09080;font-size:.8rem;margin-top:20px;text-align:center">תוקף הקוד: 10 דקות</p>
          <p style="color:#c0b0a0;font-size:.75rem;text-align:center">לא ביקשתם קוד? התעלמו ממייל זה.</p>
        </div>
      `,
    }),
  })

  if (!res.ok) return json({ sent: false, error: 'שגיאה בשליחת מייל' })
  return json({ sent: true })
}

async function handleVerifyOTP(client: SupabaseClient, email: string, otp: string) {
  if (!otp) return json({ verified: false, error: 'קוד חסר' })

  const { data } = await client
    .from('otp').select('*').ilike('email', email).eq('otp', otp).eq('used', false).maybeSingle()

  if (!data) return json({ verified: false, error: 'קוד שגוי — נסו שוב' })

  if (Date.now() > Number(data.expiry)) {
    await client.from('otp').delete().eq('id', data.id)
    return json({ verified: false, error: 'הקוד פג תוקף — בקשו קוד חדש' })
  }

  await client.from('otp').delete().eq('id', data.id)

  const { data: couple } = await client.from('couples').select('*').ilike('email', email).maybeSingle()
  return json({ verified: true, found: !!couple, record: couple ? formatCouple(couple) : null })
}

async function handleGetEmail(client: SupabaseClient, fingerprint: string) {
  const { data } = await client
    .from('device_emails').select('email').eq('fingerprint', fingerprint).maybeSingle()
  if (!data) return json({ found: false })
  return json({ found: true, email: data.email })
}

async function handleSaveEmail(client: SupabaseClient, payload: Row) {
  const { fingerprint, email, eventId } = payload as Record<string, string>
  if (!fingerprint || !email) return json({ success: false, error: 'missing params' })

  const { data: existing } = await client
    .from('device_emails').select('id').eq('fingerprint', fingerprint).maybeSingle()

  if (existing) {
    await client.from('device_emails')
      .update({ email, event_id: eventId ?? '' }).eq('fingerprint', fingerprint)
    return json({ success: true, updated: true })
  }

  await client.from('device_emails').insert({ fingerprint, email, event_id: eventId ?? '' })
  return json({ success: true, created: true })
}

async function handleCheckDate(client: SupabaseClient, eventId: string) {
  const { data } = await client
    .from('couples').select('wedding_date').eq('event_id', eventId).maybeSingle()

  if (!data) return json({ allowed: false, error: 'event not found' })

  const weddingStr = data.wedding_date as string // 'yyyy-MM-dd'

  const nowISR = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayISR = `${nowISR.getFullYear()}-${pad(nowISR.getMonth() + 1)}-${pad(nowISR.getDate())}`
  const hourISR  = nowISR.getHours()

  const yesterday = new Date(nowISR)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`

  const isWeddingDay = todayISR === weddingStr
  const isGraceHour  = yesterdayStr === weddingStr && hourISR < 6
  const allowed      = isWeddingDay || isGraceHour
  const expired      = !allowed && todayISR > weddingStr

  return json({ allowed, expired, today: todayISR, weddingDate: weddingStr })
}

// ════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════

function generateEventId() {
  return 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

function formatCouple(d: Row) {
  return {
    email:       d.email,
    brideName:   d.bride_name,
    groomName:   d.groom_name,
    weddingDate: d.wedding_date,
    theme:       d.theme,
    font:        d.font        || 'cormorant',
    texture:     d.texture     || 'none',
    fontColor:   d.font_color  || '#3a2820',
    fontSize:    d.font_size   || 'medium',
    fontWeight:  d.font_weight || '400',
    eventId:     d.event_id,
    folderId:    d.folder_id,
  }
}
