import React, { useEffect, useState, useRef } from 'react'
import { parseSrt, stringifySrt, Subtitle } from '../utils/srt'

type Props = {
  subtitles: Subtitle[]
  onChange: (subs: Subtitle[]) => void
  currentTime?: number
  playFrom?: (t: number) => void
  pause?: () => void
  keybindings?: Record<'split' | 'next' | 'prev', { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }>
  tabCreatesNewAtEnd?: boolean
}

function secToHHMMSS(sec: number) {
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

function hhmmssToSec(s: string) {
  // Accept hh:mm:ss or hh:mm:ss.mmm
  const m = s.trim().match(/(\d+):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/)
  if (!m) return 0
  const [, hh, mm, ss, ms] = m
  const milli = ms ? Number(ms.padEnd(3, '0')) : 0
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + milli / 1000
}

export default function SubtitlesList({ subtitles, onChange, currentTime = 0, playFrom, pause, keybindings, tabCreatesNewAtEnd = false }: Props) {
  const [items, setItems] = useState<Subtitle[]>(subtitles || [])
  const [activeId, setActiveId] = useState<number | null>(null)
  const lastStartSetRef = useRef<number | null>(null)
  const scrollTimerRef = useRef<number | null>(null)

  useEffect(() => setItems(subtitles || []), [subtitles])

  // Update activeId only when it actually changes to avoid flicker and
  // unnecessary DOM writes. Scrolling happens when activeId changes.
  useEffect(() => {
    if (!items || items.length === 0) {
      setActiveId(null)
      return
    }
    const found = items.find((s) => currentTime >= s.start && currentTime <= s.end)
    const newId = found ? found.id : null
    if (newId !== activeId) setActiveId(newId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, items])

  useEffect(() => {
    if (activeId == null) return
    const doScroll = () => {
      const el = document.getElementById(`sub-${activeId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // If the active id is the one we just set the start for, delay scrolling
    if (lastStartSetRef.current === activeId) {
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = window.setTimeout(() => {
        doScroll()
        lastStartSetRef.current = null
        scrollTimerRef.current = null
      }, 1000) as unknown as number
    } else {
      doScroll()
    }

    return () => {
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current)
        scrollTimerRef.current = null
      }
    }
  }, [activeId])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const txt = String(reader.result || '')
      const parsed = parseSrt(txt)
      setItems(parsed)
      onChange(parsed)
    }
    reader.readAsText(f)
  }

  const updateItem = (id: number, patch: Partial<Subtitle>) => {
    const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it))
    setItems(next)
    onChange(next)
  }

  const setStartToCurrent = (id: number) => {
    const t = Math.round(currentTime * 1000) / 1000
    const idx = items.findIndex((it) => it.id === id)
    if (idx === -1) return
    const next = items.map((it) => ({ ...it }))
    next[idx].start = t
    if (idx > 0) next[idx - 1].end = t
    setItems(next)
    onChange(next)
    lastStartSetRef.current = id
  }

  const setEndToCurrent = (id: number) => {
    const t = Math.round(currentTime * 1000) / 1000
    const idx = items.findIndex((it) => it.id === id)
    if (idx === -1) return
    const next = items.map((it) => ({ ...it }))
    next[idx].end = t
    setItems(next)
    onChange(next)
  }

  const exportSrt = () => {
    const s = stringifySrt(items)
    const blob = new Blob([s], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subtitles.srt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const insertAt = (index: number) => {
    // insert new subtitle before items[index], or at end if index === items.length
    const prev = index > 0 ? items[index - 1] : null
    const nextItem = index < items.length ? items[index] : null

    let start: number
    if (prev) start = prev.end
    else if (nextItem) start = Math.max(0, nextItem.start - 2)
    else start = 0

    let end: number
    if (nextItem) end = (start + nextItem.start) / 2
    else end = start + 2

    start = Math.round(start * 1000) / 1000
    end = Math.round(end * 1000) / 1000

    const newId = (items.length > 0 ? Math.max(...items.map((it) => it.id)) : 0) + 1
    const newSub: Subtitle = { id: newId, start, end, text: '' }
    const next = items.slice()
    next.splice(index, 0, newSub)
    setItems(next)
    onChange(next)
    return newId
  }

  // Split subtitle at cursor position when Shift+Enter is pressed
  const splitSubtitle = (id: number, textarea: HTMLTextAreaElement) => {
    const idx = items.findIndex((it) => it.id === id)
    if (idx === -1) return
    const cur = items[idx]
    const pos = textarea.selectionStart ?? textarea.value.length
  const leftText = cur.text.slice(0, pos)
  // remove any leading newline(s) from the right side so the new subtitle starts at the first line
  const rawRight = cur.text.slice(pos)
  const rightText = rawRight.replace(/^\r?\n+/, '')

    // Determine split time (smart behavior): prefer currentTime if within, otherwise midpoint
    let splitT = (typeof currentTime === 'number' && currentTime >= cur.start && currentTime <= cur.end)
      ? Math.round(currentTime * 1000) / 1000
      : Math.round(((cur.start + cur.end) / 2) * 1000) / 1000

    // Ensure splitT strictly between start and end
    if (splitT <= cur.start) splitT = Math.round(((cur.start + cur.end) / 2) * 1000) / 1000
    if (splitT >= cur.end) splitT = Math.round(((cur.start + cur.end) / 2) * 1000) / 1000

    const newId = (items.length > 0 ? Math.max(...items.map((it) => it.id)) : 0) + 1
  const newSub: Subtitle = { id: newId, start: splitT, end: cur.end, text: rightText }

    const next = items.map((it) => ({ ...it }))
    next[idx].end = splitT
    next[idx].text = leftText
    next.splice(idx + 1, 0, newSub)

  setItems(next)
  onChange(next)

    // focus the new textarea after DOM updates
    setTimeout(() => {
      const el = document.getElementById(`textarea-${newId}`) as HTMLTextAreaElement | null
      if (el) {
        el.focus()
        el.selectionStart = 0
        el.selectionEnd = 0
      }
    }, 0)
  }

  return (
    <aside className="subtitles-list">
      <h2>Subtitles</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <label>
          SRT 読み込み
          <input type="file" accept=".srt,text/plain" onChange={onFile} />
        </label>
        <button onClick={exportSrt} disabled={items.length === 0}>
          SRT をエクスポート
        </button>
      </div>

      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {/* Insert button at top (before first) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <button
            className="insert-between"
            title="ここに新しい字幕を挿入"
            aria-label="挿入-先頭"
            onClick={() => insertAt(0)}
          >
            ＋
          </button>
        </div>

        {items.length === 0 ? (
          <p>読み込まれていません。SRT ファイルを選択するか、＋で新規追加してください。</p>
        ) : (
          items.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                id={`sub-${s.id}`}
                className={s.id === activeId ? 'subtitle-item subtitle-active' : 'subtitle-item'}
                style={{ padding: 8, borderBottom: '1px solid #eee' }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <button
                    className="time-btn"
                    title="この字幕の開始 0.5 秒前から再生"
                    aria-label={`開始0.5秒前から再生-${s.id}`}
                    onClick={() => {
                      const t = Math.max(0, s.start - 0.5)
                      if (typeof playFrom === 'function') playFrom(t)
                    }}
                  >
                    ▶
                  </button>
                  <button
                    className="time-btn"
                    title="一時停止"
                    aria-label={`一時停止-${s.id}`}
                    onClick={() => {
                      if (typeof pause === 'function') pause()
                    }}
                  >
                    ⏸
                  </button>
                  <button
                    className="delete-btn"
                    title="この字幕を削除"
                    aria-label={`字幕削除-${s.id}`}
                    onClick={() => {
                      const next = items.filter((it) => it.id !== s.id)
                      setItems(next)
                      onChange(next)
                    }}
                  >
                    🗑️
                  </button>

                  <input
                    value={secToHHMMSS(s.start)}
                    onChange={(e) => updateItem(s.id, { start: hhmmssToSec(e.target.value) })}
                    style={{ width: 130 }}
                  />
                  <button
                    className="time-btn"
                    onClick={() => setStartToCurrent(s.id)}
                    title="動画の現在時刻を開始に設定"
                    aria-label={`開始を現在に設定-${s.id}`}
                  >
                    <span aria-hidden>⏱</span>
                  </button>
                  <span>→</span>
                  <input
                    value={secToHHMMSS(s.end)}
                    onChange={(e) => updateItem(s.id, { end: hhmmssToSec(e.target.value) })}
                    style={{ width: 130 }}
                  />
                  <button
                    className="time-btn"
                    onClick={() => setEndToCurrent(s.id)}
                    title="動画の現在時刻を終了に設定"
                    aria-label={`終了を現在に設定-${s.id}`}
                  >
                    <span aria-hidden>⏱</span>
                  </button>
                </div>

                <textarea
                  id={`textarea-${s.id}`}
                  value={s.text}
                  onChange={(e) => updateItem(s.id, { text: e.target.value })}
                  onKeyDown={(e) => {
                    // Shift+Enter: split subtitle at caret
                        // Use configurable keybindings if provided
                        const kb = keybindings || { split: { key: 'Enter', shift: true }, next: { key: 'Tab' }, prev: { key: 'Tab', shift: true } }
                        const matches = (binding: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }) => {
                          if (!binding) return false
                          if (binding.key.toLowerCase() !== e.key.toLowerCase()) return false
                          if (Boolean(binding.shift) !== e.shiftKey) return false
                          if (Boolean(binding.ctrl) !== e.ctrlKey) return false
                          if (Boolean(binding.alt) !== e.altKey) return false
                          if (Boolean(binding.meta) !== e.metaKey) return false
                          return true
                        }

                        if (matches(kb.split)) {
                          e.preventDefault()
                          splitSubtitle(s.id, e.currentTarget as HTMLTextAreaElement)
                          return
                        }

                        if (matches(kb.next) || matches(kb.prev)) {
                          e.preventDefault()
                          const idx = items.findIndex((it) => it.id === s.id)
                          if (idx === -1) return
                          const forward = matches(kb.next)
                          let targetIdx = forward ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1)

                          // If at end and pressing Tab forward and setting says to create new, do it
                          if (forward && idx === items.length - 1 && tabCreatesNewAtEnd) {
                            const newId = insertAt(items.length)
                            setTimeout(() => {
                              const el = document.getElementById(`textarea-${newId}`) as HTMLTextAreaElement | null
                              if (el) {
                                el.focus()
                                el.selectionStart = 0
                                el.selectionEnd = 0
                              }
                            }, 0)
                            return
                          }

                          const target = items[targetIdx]
                          if (!target) return
                          const el = document.getElementById(`textarea-${target.id}`) as HTMLTextAreaElement | null
                          if (el) {
                            el.focus()
                            el.selectionStart = 0
                            el.selectionEnd = 0
                          }
                        }
                  }}
                  style={{ width: '100%', minHeight: 48 }}
                />
              </div>

              {/* Insert button between this and next */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                <button
                  className="insert-between"
                  title="ここに新しい字幕を挿入"
                  aria-label={`挿入-${i + 1}`}
                  onClick={() => insertAt(i + 1)}
                >
                  ＋
                </button>
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </aside>
  )
}
