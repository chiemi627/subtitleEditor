export type Subtitle = {
  id: number
  start: number // seconds
  end: number // seconds
  text: string
}

function parseTimecode(tc: string) {
  // format: 00:01:23,456
  const m = tc.trim().match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
  if (!m) return 0
  const [, hh, mm, ss, ms] = m
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000
}

export function parseSrt(srt: string): Subtitle[] {
  const parts = srt.replace(/\r/g, '').split('\n\n')
  const out: Subtitle[] = []
  let id = 1
  for (const p of parts) {
    const lines = p.split('\n').filter(Boolean)
    if (lines.length >= 2) {
      // lines[0] might be index
      let idx = 0
      if (/^\d+$/.test(lines[0].trim())) idx = 1
      const times = lines[idx].split('-->')
      if (times.length === 2) {
        const start = parseTimecode(times[0])
        const end = parseTimecode(times[1])
        const text = lines.slice(idx + 1).join('\n')
        out.push({ id: id++, start, end, text })
      }
    }
  }
  return out
}

export function stringifySrt(subs: Subtitle[]): string {
  return subs
    .map((s, i) => {
      const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0')
      const fmt = (sec: number) => {
        const hh = Math.floor(sec / 3600)
        const mm = Math.floor((sec % 3600) / 60)
        const ss = Math.floor(sec % 60)
        const ms = Math.floor((sec - Math.floor(sec)) * 1000)
        return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)},${String(ms).padStart(3, '0')}`
      }

      return `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}\n`
    })
    .join('\n')
}
