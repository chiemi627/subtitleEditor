import React, { useState } from 'react'
import VideoPlayer from './components/VideoPlayer'
import SubtitlesList from './components/SubtitlesList'
import ShortcutSettings from './components/ShortcutSettings'
import { Subtitle } from './utils/srt'

export default function App() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [playerCtrl, setPlayerCtrl] = useState<{ playFrom: (t: number) => void; pause?: () => void } | null>(null)
  const [tabCreatesNewAtEnd, setTabCreatesNewAtEnd] = useState<boolean>(false)
  const [keybindings, setKeybindings] = useState<Record<'split' | 'next' | 'prev', { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }>>({
    split: { key: 'Enter', shift: true },
    next: { key: 'Tab' },
    prev: { key: 'Tab', shift: true },
  })

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
        <VideoPlayer onTimeUpdate={(t: number) => setCurrentTime(t)} onReady={(c: { playFrom: (t: number) => void; pause?: () => void }) => setPlayerCtrl(c)} />
        <SubtitlesList
          subtitles={subtitles}
          onChange={setSubtitles}
          currentTime={currentTime}
          playFrom={playerCtrl?.playFrom}
          pause={playerCtrl?.pause}
          keybindings={keybindings}
          tabCreatesNewAtEnd={tabCreatesNewAtEnd}
        />
      </main>
    </div>
  )
}
