import { useEffect, useState } from 'react'

/** Layout numbers for debugging iPhone Home Screen quirks. Opened by long-pressing the Home logo. */
export default function Diagnostics({ onClose }: { onClose: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const update = () => tick((n) => n + 1)
    const id = window.setInterval(update, 500)
    window.addEventListener('scroll', update)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('scroll', update)
    }
  }, [])

  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden'
  document.body.appendChild(probe)
  const safe = getComputedStyle(probe)
  const safeTop = safe.paddingTop
  const safeBottom = safe.paddingBottom
  probe.remove()

  const r = (sel: string) => {
    const b = document.querySelector(sel)?.getBoundingClientRect()
    return b ? `${Math.round(b.top)}–${Math.round(b.bottom)}` : '–'
  }
  const vv = window.visualViewport
  const rows: [string, string | number][] = [
    ['standalone', String(matchMedia('(display-mode: standalone)').matches)],
    ['screen', `${screen.width}×${screen.height}`],
    ['innerHeight', innerHeight],
    ['clientHeight', document.documentElement.clientHeight],
    ['visualViewport', vv ? `${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : '–'],
    ['scrollY / scrollHeight', `${Math.round(scrollY)} / ${document.documentElement.scrollHeight}`],
    ['body height', Math.round(document.body.getBoundingClientRect().height)],
    ['safe top / bottom', `${safeTop} / ${safeBottom}`],
    ['header', r('header')],
    ['tab bar', r('nav')],
    ['ua', navigator.userAgent.match(/OS [\d_]+/)?.[0] ?? navigator.userAgent.slice(0, 40)],
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', left: 12, right: 12, top: '30%', zIndex: 100, padding: 12, borderRadius: 12,
        background: 'rgba(0,0,0,0.88)', color: '#fff', font: '12px/1.6 ui-monospace, monospace',
      }}
    >
      {rows.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
      <div style={{ opacity: 0.6, marginTop: 6 }}>Tap to close</div>
    </div>
  )
}
