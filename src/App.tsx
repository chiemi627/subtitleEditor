import React, { useState } from 'react'
import VideoPlayer from './components/VideoPlayer'
import SubtitlesList from './components/SubtitlesList'

export default function App() {
  const [subtitles, setSubtitles] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [playerCtrl, setPlayerCtrl] = useState<{ playFrom: (t: number) => void; pause?: () => void } | null>(null)

  return (
    <div className="app">
      <header>
        <h1>Subtitle Editor</h1>
      </header>
      <main className="layout">
        <VideoPlayer onTimeUpdate={(t: number) => setCurrentTime(t)} onReady={(c: { playFrom: (t: number) => void; pause?: () => void }) => setPlayerCtrl(c)} />
        <SubtitlesList
          subtitles={subtitles}
          onChange={setSubtitles}
          currentTime={currentTime}
          playFrom={playerCtrl?.playFrom}
          pause={playerCtrl?.pause}
        />
      </main>
    </div>
  )
}
