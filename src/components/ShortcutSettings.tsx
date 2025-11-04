import React, { useState } from 'react'

type Binding = { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }

type Action = 'split' | 'next' | 'prev' | 'playpause' | 'merge' | 'setStart'
type Props = {
  keybindings: Record<Action, Binding>
  setKeybindings: (kb: Record<Action, Binding>) => void
  tabCreatesNewAtEnd: boolean
  setTabCreatesNewAtEnd: (v: boolean) => void
}

function bindingToLabel(b: Binding) {
  const parts: string[] = []
  if (b.ctrl) parts.push('Ctrl')
  if (b.alt) parts.push('Alt')
  if (b.shift) parts.push('Shift')
  if (b.meta) parts.push('Meta')
  const k = b.key
  if (k === ' ' || k === '') parts.push('Space')
  else parts.push(String(k).toUpperCase())
  return parts.join(' + ')
}

export default function ShortcutSettings({ keybindings, setKeybindings, tabCreatesNewAtEnd, setTabCreatesNewAtEnd }: Props) {
  const [editing, setEditing] = useState<null | Action>(null)

  const startEdit = (action: Action) => {
    setEditing(action)
  }

  const onCapture = (e: React.KeyboardEvent<HTMLInputElement>, action: Action) => {
    e.preventDefault()
    const b: Binding = { key: e.key }
    if (e.ctrlKey) b.ctrl = true
    if (e.altKey) b.alt = true
    if (e.shiftKey) b.shift = true
    if (e.metaKey) b.meta = true
    const next = { ...keybindings, [action]: b }
    setKeybindings(next)
    setEditing(null)
  }

  return (
    <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: 6, background: '#fafafa', minWidth: 360 }}>
      <strong>ショートカット設定</strong>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 6 }}>キーバインディング（キーをクリックして、割り当てたいキーを押してください）</div>

        {(['split', 'next', 'prev', 'playpause', 'merge', 'setStart'] as const).map((action) => (
          <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 220 }}>
              {action === 'split' && '字幕の分割'}
              {action === 'next' && '編集を次に進める'}
              {action === 'prev' && '編集を前に戻す'}
              {action === 'playpause' && '再生 / 一時停止 (トグル)'}
              {action === 'merge' && '前の字幕と結合 (Ctrl+Backspace)'}
              {action === 'setStart' && '開始時刻を現在時刻に設定 (Ctrl+T)'}
            </div>
            <input
              readOnly
              value={bindingToLabel(keybindings[action])}
              onFocus={() => startEdit(action)}
              onKeyDown={(e) => onCapture(e, action)}
              style={{ width: 180 }}
            />
            <button onClick={() => startEdit(action)}>{editing === action ? '入力中…' : '編集'}</button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <label>
          <input type="checkbox" checked={tabCreatesNewAtEnd} onChange={(e) => setTabCreatesNewAtEnd(e.target.checked)} />
          末尾で Tab を押したら新しい字幕を追加して移動する
        </label>
      </div>
    </div>
  )
}
