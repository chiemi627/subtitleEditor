import React, { useEffect, useRef, useState } from 'react'

type Props = {
  onTimeUpdate?: (time: number, paused: boolean) => void
  onReady?: (ctrl: { playFrom: (time: number) => void; pause: () => void; toggle?: () => void }) => void
}

export default function VideoPlayer({ onReady, onTimeUpdate, ...props }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(true)
  const readyCalledRef = useRef(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onLoaded = () => setDuration(v.duration || 0)
    const onTime = () => {
      setCurrent(v.currentTime)
      setPaused(v.paused)
      onTimeUpdate?.(v.currentTime, v.paused)
    }

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [onTimeUpdate])

  // expose a simple controller to parent so it can request seeking+play
  useEffect(() => {
    // call onReady only once (guarded) to avoid repeated parent state updates
    if (readyCalledRef.current) return
    if (typeof onReady === 'function') {
      readyCalledRef.current = true
      onReady({
        playFrom: (t: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = t
            videoRef.current.play()
          }
        },
        pause: () => {
          videoRef.current?.pause()
        },
        toggle: () => {
          if (!videoRef.current) return
          if (videoRef.current.paused) videoRef.current.play()
          else videoRef.current.pause()
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty: guarded by readyCalledRef

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    if (videoRef.current) {
      videoRef.current.src = url
      videoRef.current.load()
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) videoRef.current.play()
    else videoRef.current.pause()
  }

  const seekTo = (t: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.min(Math.max(0, t), duration || t)
  }

  const fmt = (s: number) => {
    if (!isFinite(s)) return '00:00.000'
    const hh = Math.floor(s / 3600)
    const mm = Math.floor((s % 3600) / 60)
    const ss = Math.floor(s % 60)
    const ms = Math.floor((s - Math.floor(s)) * 1000)
    const base = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    const withMs = `${base}.${String(ms).padStart(3, '0')}`
    if (hh > 0) return `${String(hh).padStart(2, '0')}:${withMs}`
    return withMs
  }

  return (
    <section className="video-area">
      <div>
        <label>
          動画読み込み
          <input type="file" accept="video/mp4,video/*" onChange={onFile} />
        </label>
      </div>

      <video ref={videoRef} style={{ width: '640px', maxWidth: '100%' }} />

      <div className="controls">
        <button onClick={togglePlay}>{paused ? '再生' : '一時停止'}</button>
        <button onClick={() => seekTo((videoRef.current?.currentTime || 0) - 5)}>-5s</button>
        <button onClick={() => seekTo((videoRef.current?.currentTime || 0) + 5)}>+5s</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          <span>{fmt(current)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.001}
            value={current}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{ width: 300 }}
          />
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </section>
  )
}
