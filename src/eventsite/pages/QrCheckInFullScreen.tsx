import React, { useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'

import { useAuth } from '../../context/AuthContext'
import { extractProfileUrlFromScanValue, normalizePublicProfileUrl } from '../lib/attendanceUtils'
import { getRegistrationsForEvent, markAttendance } from '../lib/firestoreEvents'
import type { AttendanceRecord, TicketRegistration } from '../lib/eventModels'

type Props = {
  eventId: string
}

type ScanSource = 'native' | 'jsqr'

export default function QrCheckInFullScreen({ eventId }: Props) {
  const { profile, firebaseUser } = useAuth()

  const [permissionState, setPermissionState] = useState<'idle' | 'starting' | 'granted' | 'denied' | 'error'>('idle')
  const [cameraMessage, setCameraMessage] = useState<string | null>(null)
  const [scanSource, setScanSource] = useState<ScanSource>('jsqr')

  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})

  const [lastDecoded, setLastDecoded] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)
  const [busy, setBusy] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  const offscreen = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    return { canvas, ctx }
  }, [])

  const decodeAttempt = async () => {
    if (!videoRef.current || !offscreen.ctx) return
    const video = videoRef.current
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return

    // throttle a bit
    const now = Date.now()
    if (busy) return
    if (now < cooldownUntil) return

    setBusy(true)
    try {
      const canvas = offscreen.canvas
      const ctx = offscreen.ctx
      canvas.width = w
      canvas.height = h

      ctx.drawImage(video, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)

      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })
      if (!code?.data) return

      const raw = code.data
      setLastDecoded(raw)

      const normalizedProfileUrl = extractProfileUrlFromScanValue(raw) || normalizePublicProfileUrl(raw)
      if (!normalizedProfileUrl) {
        setCameraMessage('QR scanned, but it did not contain a valid attendee profile link.')
        return
      }

      const matched = registrations.find((r) => normalizePublicProfileUrl(r.profileUrl) === normalizedProfileUrl)
      if (!matched) {
        setCameraMessage('No attendee matched that public profile URL yet.')
        return
      }

      const already = Boolean(attendance[matched.id!])
      if (already) {
        setCameraMessage(`${matched.fullName} is already checked in.`)
        setCooldownUntil(Date.now() + 1500)
        return
      }

      const did = await markAttendance({
        eventId,
        registrationId: matched.id!,
        fullName: matched.fullName,
        email: matched.email,
        status: 'checked-in',
        checkedInBy: profile?.uid || firebaseUser?.uid,
        checkedInByName: profile?.fullName || firebaseUser?.displayName || 'Host',
      })

      // Optimistic UI update
      setAttendance((prev) => ({
        ...prev,
        [matched.id!]: did as any,
      }))

      setCameraMessage(`Checked in: ${matched.fullName}`)
      setCooldownUntil(Date.now() + 2500)
    } catch (e: any) {
      setError(e?.message || 'Unable to scan QR right now.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const regs = await getRegistrationsForEvent(eventId)
        if (cancelled) return
        setRegistrations(regs)
      } catch {
        // If registrations fail, scanning will still run but won’t match.
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [eventId])

  useEffect(() => {
    if (!scanning) return

    async function startCamera() {
      setPermissionState('starting')
      setCameraMessage('Requesting camera permission…')
      setError(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        streamRef.current = stream
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        setPermissionState('granted')
        setCameraMessage('Auto scanning enabled. Show a profile QR to the camera.')

        const loop = async () => {
          if (!scanning) return
          await decodeAttempt()
          rafRef.current = window.requestAnimationFrame(loop)
        }

        rafRef.current = window.requestAnimationFrame(loop)
      } catch (e: any) {
        setPermissionState('denied')
        setCameraMessage(
          e?.name === 'NotAllowedError'
            ? 'Camera permission blocked. Enable it in browser settings and reload.'
            : 'Unable to start camera.'
        )
      }
    }

    startCamera()

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, scanning, decodeAttempt])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setScanning(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // When scanning stops, we just stop camera and leave UI.
  // Parent route can decide whether to navigate away.

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

        {/* Center QR guide */}
        <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 border-4 border-[rgba(41,211,145,.9)] rounded-2xl shadow-[0_0_0_6px_rgba(41,211,145,.18)]" />

        {/* Top overlay */}
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-white/70">QR Auto Check-in</div>
            <div className="mt-1 text-lg font-extrabold">Event: {eventId}</div>
          </div>
          <div className="text-right text-xs text-white/70">
            {permissionState === 'starting' && <div>Starting camera…</div>}
            {permissionState === 'granted' && <div>Scanning…</div>}
            {permissionState === 'denied' && <div>Camera denied</div>}
            {scanSource && <div className="mt-1">Decoder: {scanSource}</div>}
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute left-4 right-4 bottom-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4">
            {cameraMessage ? <div className="text-sm font-semibold">{cameraMessage}</div> : null}
            {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : null}
            <div className="mt-2 text-xs text-white/70">
              {lastDecoded ? (
                <span className="break-all">Last QR: {lastDecoded}</span>
              ) : (
                <span>Point the camera at a QR code.</span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setScanning(false)}
                className="rounded-xl bg-white/15 hover:bg-white/20 px-3 py-2 text-xs font-bold"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

