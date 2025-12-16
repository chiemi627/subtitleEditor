import React, { useState } from 'react'
import VideoPlayer from './components/VideoPlayer'
import SubtitlesList from './components/SubtitlesList'
import ShortcutSettings from './components/ShortcutSettings'
import { Subtitle } from './utils/srt'

export default function App() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [playerCtrl, setPlayerCtrl] = useState<{ playFrom: (t: number) => void; pause?: () => void; toggle?: () => void } | null>(null)
  const [tabCreatesNewAtEnd, setTabCreatesNewAtEnd] = useState<boolean>(false)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true)
  const [keybindings, setKeybindings] = useState<Record<'split' | 'next' | 'prev' | 'playpause' | 'merge' | 'setStart', { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }>>({
    split: { key: 'Enter', ctrl: true },
    next: { key: 'Tab' },
    prev: { key: 'Tab', shift: true },
    playpause: { key: 'p', ctrl: true },
    merge: { key: 'Backspace', ctrl: true },
    setStart: { key: 't', ctrl: true },
  })

  // グローバルショートカット: 字幕にフォーカスがなくても再生/一時停止を処理する
  React.useEffect(() => {
    const normKey = (k: string | undefined) => {
      if (!k) return ''
      if (k === ' ' || k.toLowerCase() === 'space' || k.toLowerCase() === 'spacebar') return 'space'
      return k.toLowerCase()
    }

    const handler = (e: KeyboardEvent) => {
      try {
        if (e.defaultPrevented) return
        const binding = keybindings.playpause
        if (!binding) return
        const eventKey = (e.key === ' ' || e.key.toLowerCase() === 'space' || e.key.toLowerCase() === 'spacebar') ? 'space' : String(e.key).toLowerCase()
        if (normKey(binding.key) !== eventKey) return
        if (Boolean(binding.shift) !== e.shiftKey) return
        if (Boolean(binding.ctrl) !== e.ctrlKey) return
        if (Boolean(binding.alt) !== e.altKey) return
        if (Boolean(binding.meta) !== e.metaKey) return

        // マッチしたら既定動作を抑制し、プレイヤー制御
        e.preventDefault()
        if (!playerCtrl) return
        if (isPaused) {
          // 停止中 -> 現在時刻から再生
          playerCtrl.playFrom?.(currentTime)
        } else {
          // 再生中 -> 一時停止
          playerCtrl.pause?.()
        }
      } catch (err) {
        // noop
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keybindings, playerCtrl, currentTime, isPaused])

  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="app">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Subtitle Editor</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-expanded={showSettings}
            aria-controls="shortcut-settings"
            title="ショートカット設定を開く"
          >
            ⚙️ 設定
          </button>
        </div>
      </header>

        {showSettings && (
        <div id="shortcut-settings" style={{ position: 'absolute', right: 20, top: 64, zIndex: 40 }}>
          <ShortcutSettings
            keybindings={keybindings}
            setKeybindings={setKeybindings}
            tabCreatesNewAtEnd={tabCreatesNewAtEnd}
            setTabCreatesNewAtEnd={setTabCreatesNewAtEnd}
          />
        </div>
      )}

      <main className="layout">
        <VideoPlayer onTimeUpdate={(t: number, p?: boolean) => { setCurrentTime(t); if (typeof p === 'boolean') setIsPaused(p) }} onReady={(c: { playFrom: (t: number) => void; pause?: () => void; toggle?: () => void }) => setPlayerCtrl(c)} />
        <SubtitlesList
          subtitles={subtitles}
          onChange={setSubtitles}
          currentTime={currentTime}
          playFrom={playerCtrl?.playFrom}
          pause={playerCtrl?.pause}
          togglePlay={playerCtrl?.toggle}
          isPaused={isPaused}
          keybindings={keybindings}
          tabCreatesNewAtEnd={tabCreatesNewAtEnd}
          autoScrollEnabled={autoScrollEnabled}
          onToggleAutoScroll={() => setAutoScrollEnabled((v) => !v)}
        />
      </main>
    </div>
  )
}
