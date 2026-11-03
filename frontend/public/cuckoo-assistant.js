(() => {
  if (window.__cuckooAssistantLoaded) return
  window.__cuckooAssistantLoaded = true

  const CHAT_ENDPOINT = '/api/chat'
  const SPLINE_RUNTIME = 'https://unpkg.com/@splinetool/runtime@2.0.130/build/runtime.js'
  const SPLINE_SCENE = 'https://prod.spline.design/BXI1TuYOOKnkbi3q/scene.splinecode'
  const MAX_HISTORY = 12
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const host = document.createElement('div')
  host.id = 'cuckoo-assistant'
  document.body.append(host)

  const shadow = host.attachShadow({ mode: 'open' })

  shadow.innerHTML = `
    <style>
      :host {
        --green: #537b2f;
        --green-deep: #36501f;
        --green-ink: #36501f;
        --gold: #e8a33d;
        --gold-soft: #f7e3bf;
        --paper: #fffdf9;
        --cream: #f4f1e6;
        --ink: #16231d;
        --muted: #68756e;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
      }

      * { box-sizing: border-box; }

      #stage {
        position: fixed;
        inset: 0;
        z-index: 2147482800;
        pointer-events: none;
        opacity: 0;
        transition: opacity .5s ease;
      }
      #stage.ready { opacity: 1; }
      #bird { width: 100%; height: 100%; display: block; background: transparent; }

      #hit {
        position: fixed;
        right: 14px;
        bottom: calc(14px + var(--cuckoo-banner-offset, 0px));
        z-index: 2147482900;
        width: 66px;
        height: 66px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        outline: none;
      }
      #hit::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: var(--paper) url("/icon-192.png") center / 58% no-repeat;
        box-shadow: 0 10px 30px rgb(27 36 16 / 30%);
        transition: opacity .25s ease, transform .25s ease;
      }
      #hit:hover::before { transform: translateY(-2px); }
      #hit.live::before { opacity: 0; }
      #hit:focus-visible::before { box-shadow: 0 0 0 3px var(--gold); }
      #hit.live:focus-visible { outline: 2px solid var(--gold); outline-offset: 6px; }

      #tip {
        position: fixed;
        right: 88px;
        bottom: calc(32px + var(--cuckoo-banner-offset, 0px));
        z-index: 2147482950;
        padding: 9px 13px;
        border-radius: 14px 14px 4px 14px;
        background: var(--paper);
        color: var(--green-ink);
        box-shadow: 0 6px 20px rgb(27 36 16 / 22%);
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        transform: translateX(8px) scale(.96);
        transition: opacity .25s ease, transform .25s ease;
        pointer-events: none;
      }
      #tip.show { opacity: 1; transform: none; }

      #chat {
        position: fixed;
        right: 16px;
        bottom: calc(92px + var(--cuckoo-banner-offset, 0px));
        z-index: 2147483000;
        display: flex;
        flex-direction: column;
        width: 340px;
        max-width: calc(100vw - 32px);
        height: 470px;
        max-height: calc(100dvh - 120px - var(--cuckoo-banner-offset, 0px));
        overflow: hidden;
        border-radius: 20px;
        background: var(--paper);
        box-shadow: 0 18px 50px rgb(27 36 16 / 30%);
        opacity: 0;
        transform: translateY(16px) scale(.96);
        transform-origin: bottom right;
        transition: opacity .25s ease, transform .3s cubic-bezier(.2, 1.3, .4, 1);
        pointer-events: none;
      }
      #chat.open { opacity: 1; transform: none; pointer-events: auto; }

      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: linear-gradient(135deg, var(--green-deep), var(--green));
        color: var(--paper);
      }
      .head b { display: block; font-size: 15px; }
      .head small { font-size: 12px; opacity: .88; }
      .head .dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 5px;
        border-radius: 50%;
        background: #7be08a;
      }
      #x {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 50%;
        background: rgb(255 255 255 / 20%);
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-size: 16px;
      }
      #x:hover { background: rgb(255 255 255 / 30%); }

      #log {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        padding: 14px;
        background: var(--cream);
      }
      .m {
        max-width: 82%;
        padding: 9px 12px;
        border-radius: 14px;
        font-size: 14px;
        line-height: 1.45;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        animation: pop .25s ease;
      }
      .m.bot {
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        background: var(--paper);
        box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
      }
      .m.me {
        align-self: flex-end;
        border-bottom-right-radius: 4px;
        background: var(--green);
        color: var(--paper);
      }
      .m.typing { display: flex; gap: 4px; padding: 12px; }
      .m.typing i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #b99a78;
        animation: bl 1s infinite;
      }
      .m.typing i:nth-child(2) { animation-delay: .15s; }
      .m.typing i:nth-child(3) { animation-delay: .3s; }

      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        padding: 6px 10px;
        border: 1px solid #e0d8c4;
        border-radius: 999px;
        background: var(--paper);
        color: var(--green-ink);
        cursor: pointer;
        font: inherit;
        font-size: 12px;
      }
      .chip:hover { background: var(--gold-soft); }

      form {
        display: flex;
        gap: 8px;
        padding: 10px;
        border-top: 1px solid #ece4d1;
        background: var(--paper);
      }
      input {
        flex: 1;
        min-width: 0;
        padding: 9px 14px;
        border: 1px solid #e0d8c4;
        border-radius: 999px;
        background: var(--paper);
        color: var(--ink);
        font: inherit;
        font-size: 14px;
        outline: none;
      }
      input:focus { border-color: var(--gold); }
      form button {
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        background: var(--gold);
        color: #4a2f12;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }
      form button:disabled { opacity: .55; cursor: not-allowed; }

      @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @keyframes bl { 0%, 80%, 100% { opacity: .3; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.1); } }

      @media (max-width: 480px) {
        #chat { right: 8px; bottom: calc(84px + var(--cuckoo-banner-offset, 0px)); width: calc(100vw - 16px); }
      }

      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
      }
    </style>

    <div id="stage"><canvas id="bird" aria-hidden="true"></canvas></div>
    <div id="tip">Ask Cuckoo AI</div>
    <button id="hit" type="button" aria-label="Ask Cuckoo AI" aria-expanded="false" aria-controls="chat"></button>
    <section id="chat" role="dialog" aria-label="Cuckoo AI chat" aria-hidden="true">
      <div class="head">
        <div><b>Cuckoo AI</b><small><span class="dot"></span>Your safari planning helper</small></div>
        <button id="x" type="button" aria-label="Close chat">&times;</button>
      </div>
      <div id="log" role="log" aria-live="polite" aria-relevant="additions"></div>
      <form id="f">
        <input id="q" type="text" maxlength="1000" placeholder="Ask about safaris…" autocomplete="off" aria-label="Your message" required>
        <button type="submit">Send</button>
      </form>
    </section>
  `

  const $ = (selector) => shadow.querySelector(selector)
  const stage = $('#stage')
  const canvas = $('#bird')
  const hit = $('#hit')
  const tip = $('#tip')
  const chat = $('#chat')
  const log = $('#log')
  const form = $('#f')
  const input = $('#q')
  const closeButton = $('#x')
  const sendButton = form.querySelector('button')

  const history = []
  let pending = false
  let open = false
  let bannerOffset = 0

  function syncBannerOffset() {
    const banner = document.getElementById('cuckoo-cookie-banner')
    let height = 0
    if (banner) {
      const style = getComputedStyle(banner)
      const rect = banner.getBoundingClientRect()
      if (style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01) {
        height = Math.max(0, Math.round(rect.height))
      }
    }
    bannerOffset = height
    host.style.setProperty('--cuckoo-banner-offset', height + 'px')
  }

  syncBannerOffset()
  window.addEventListener('resize', syncBannerOffset)
  new MutationObserver(syncBannerOffset).observe(document.body, { childList: true })
  window.setTimeout(syncBannerOffset, 400)
  window.setTimeout(syncBannerOffset, 1200)

  function addMessage(text, who) {
    const node = document.createElement('div')
    node.className = 'm ' + who
    if (who === 'typing') node.innerHTML = '<i></i><i></i><i></i>'
    else node.textContent = text
    log.appendChild(node)
    log.scrollTop = log.scrollHeight
    return node
  }

  function addSuggestions() {
    const wrap = document.createElement('div')
    wrap.className = 'chips'
    ;['Best time to visit', 'Popular safaris', 'Plan my trip', 'Contact a guide'].forEach((label) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'chip'
      button.textContent = label
      button.addEventListener('click', () => send(label))
      wrap.appendChild(button)
    })
    log.appendChild(wrap)
    log.scrollTop = log.scrollHeight
  }

  function greet() {
    addMessage("Hi, I'm Cuckoo! 🐦 I can help you plan your safari. What would you like to know?", 'bot')
    addSuggestions()
  }

  function fallback(message) {
    const m = message.toLowerCase()
    if (/(when|best time|season|month)/.test(m)) return 'The dry season (June to October) is wonderful for game viewing, and Victoria Falls is at its most dramatic around the peak water months. Tell me your dates and I can suggest options.'
    if (/(price|cost|how much|budget)/.test(m)) return 'Prices depend on the length, season and comfort level. Share your budget and group size and I will point you to the right package.'
    if (/(popular|safari|tour|package|where)/.test(m)) return 'Our most-loved trips include Victoria Falls day tours, Chobe and Hwange game drives, and multi-country safari packages. Want me to narrow them down?'
    if (/(contact|guide|human|call|email|book)/.test(m)) return 'I can connect you with one of our safari guides. Leave your email and preferred dates and the Cuckoo Safaris team will be in touch.'
    if (/(hi|hello|hey)/.test(m)) return 'Hello! 🐦 How can I help with your safari today?'
    return 'Great question! I can help with destinations, seasons, packages and bookings. What would you like to explore first?'
  }

  async function requestReply(message) {
    if (!CHAT_ENDPOINT) return fallback(message)
    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(-MAX_HISTORY) }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && typeof data.reply === 'string' && data.reply.trim()) return data.reply.trim()
      return fallback(message)
    } catch {
      return fallback(message)
    }
  }

  async function send(raw) {
    const message = (raw || '').trim()
    if (!message || pending) return
    if (!open) toggle(true)

    addMessage(message, 'me')
    pending = true
    sendButton.disabled = true
    const typing = addMessage('', 'typing')

    const [reply] = await Promise.all([
      requestReply(message),
      new Promise((resolve) => window.setTimeout(resolve, 550)),
    ])

    typing.remove()
    addMessage(reply, 'bot')
    history.push({ role: 'user', text: message }, { role: 'model', text: reply })
    pending = false
    sendButton.disabled = false
  }

  function toggle(value) {
    open = value
    chat.classList.toggle('open', open)
    chat.setAttribute('aria-hidden', String(!open))
    hit.setAttribute('aria-expanded', String(open))
    if (open) {
      tip.classList.remove('show')
      if (!log.children.length) greet()
      window.setTimeout(() => input.focus(), 250)
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = input.value
    input.value = ''
    send(value)
  })

  closeButton.addEventListener('click', () => toggle(false))
  hit.addEventListener('click', () => {
    clickAt = tNow
    toggle(!open)
  })
  hit.addEventListener('mouseenter', () => { if (!open) tip.classList.add('show') })
  hit.addEventListener('mouseleave', () => tip.classList.remove('show'))
  hit.addEventListener('focus', () => { if (!open) tip.classList.add('show') })
  hit.addEventListener('blur', () => tip.classList.remove('show'))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) toggle(false)
  })

  window.setTimeout(() => {
    if (!open) {
      tip.classList.add('show')
      window.setTimeout(() => tip.classList.remove('show'), 4500)
    }
  }, 1800)

  const objectNames = ['Cuckoo Root', 'Head Pivot', 'Eye L Pivot', 'Eye R Pivot', 'Wing L Pivot', 'Wing R Pivot', 'Tail Pivot']
  const objects = {}
  let clickAt = -10
  let tiltAt = 2.5
  let tiltDir = 1
  let blinkAt = 3
  let tNow = 0
  let yawCur = 0

  const ease = (p) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, p))) / 2
  const bump = (t, start, duration) => {
    const p = (t - start) / duration
    return p < 0 || p > 1 ? 0 : Math.sin(Math.PI * p)
  }

  function setTransform(name, props) {
    const object = objects[name]
    if (!object) return
    if (props.position) {
      object.position.x = props.position.x
      object.position.y = props.position.y
      object.position.z = props.position.z
    }
    if (props.rotation) {
      const toRad = Math.PI / 180
      object.rotation.x = props.rotation.x * toRad
      object.rotation.y = props.rotation.y * toRad
      object.rotation.z = props.rotation.z * toRad
    }
    if (props.scale) {
      object.scale.x = props.scale.x
      object.scale.y = props.scale.y
      object.scale.z = props.scale.z
    }
  }

  function frame(now) {
    const t = (now - t0) / 1000
    tNow = t
    const vw = window.innerWidth
    const vh = window.innerHeight
    const H = 2 * CAM_Z * Math.tan(FOV * Math.PI / 360)
    const ppu = vh / H
    const s = ICON_PX / (BIRD_H * ppu)
    const cx = vw - 14 - 33
    const cy = vh - bannerOffset - 14 - 33
    const wx = (cx - vw / 2) / ppu
    const wy = -(cy - vh / 2) / ppu - BIRD_CY * s

    const STEP_T = 0.65, STEP_Z = 70, STEP_X = 75, WALK_START = 3, WALK_PERIOD = 16, LAT_START = 4
    let zOff = 0, xOff = 0, hop = 0, waddle = 0, yawTarget = 0
    if (t >= WALK_START) {
      const wt = (t - WALK_START) % WALK_PERIOD
      if (wt < 4 * STEP_T) {
        const k = Math.floor(wt / STEP_T), p = (wt - k * STEP_T) / STEP_T
        const from = k < 2 ? k : 4 - k, to = k < 2 ? from + 1 : from - 1
        zOff = (from + (to - from) * ease(p)) * STEP_Z
        hop = Math.sin(Math.PI * p)
        waddle = (k % 2 ? 1 : -1) * hop
      } else if (wt >= LAT_START && wt < LAT_START + 4 * STEP_T) {
        const lt = wt - LAT_START
        const k = Math.floor(lt / STEP_T), p = (lt - k * STEP_T) / STEP_T
        const from = k < 2 ? k : 4 - k, to = k < 2 ? from + 1 : from - 1
        xOff = -(from + (to - from) * ease(p)) * STEP_X
        hop = Math.sin(Math.PI * p)
        waddle = (k % 2 ? 1 : -1) * hop
        yawTarget = k < 2 ? -50 : 45
      }
    }
    yawCur += (yawTarget - yawCur) * 0.14
    const pf = (CAM_Z - zOff) / CAM_Z

    const ck = t - clickAt
    const b = ck >= 0 && ck < 0.9 ? Math.abs(Math.sin(ck * Math.PI * 2.2)) * Math.exp(-ck * 2.2) : 0
    const squash = ck >= 0 && ck < 0.9 ? Math.sin(ck * Math.PI * 4.4) * Math.exp(-ck * 3) * 0.06 : 0
    const float = Math.sin(t * 1.6) * 6 * s + b * 38 * s
    const sway = Math.sin(t * 0.9) * 3

    setTransform('Cuckoo Root', {
      position: { x: (wx + xOff) * pf, y: wy * pf + float + hop * 16 * s, z: zOff },
      rotation: {
        x: Math.sin(t * 1.2) * 2 + hop * 8,
        y: -18 + yawCur + sway + (ck >= 0 && ck < 0.7 ? Math.sin(ck * 9) * 10 * Math.exp(-ck * 3) : 0),
        z: Math.sin(t * 0.7) * 2 + waddle * 7,
      },
      scale: { x: s * (1 + squash), y: s * (1 - squash), z: s * (1 + squash) },
    })

    if (t > tiltAt + 1.6) {
      tiltAt = t + 2.5 + Math.random() * 4
      tiltDir = Math.random() < 0.5 ? -1 : 1
    }
    const tilt = bump(t, tiltAt, 1.6)
    const tz = ease(tilt) * 13 * tiltDir
    setTransform('Head Pivot', { rotation: { x: Math.sin(t * 1.6 + 1) * 2 - b * 8, y: tz * 0.8, z: tz } })

    if (t > blinkAt + 0.2) blinkAt = t + 2.2 + Math.random() * 3.2
    const bl = bump(t, blinkAt, 0.2)
    const ey = Math.max(0.08, 1 - bl * 0.95)
    setTransform('Eye L Pivot', { scale: { x: 1, y: ey, z: 1 } })
    setTransform('Eye R Pivot', { scale: { x: 1, y: ey, z: 1 } })

    const flap = ck >= 0 && ck < 1 ? Math.sin(ck * Math.PI * 7) * 28 * Math.exp(-ck * 2.2) : 0
    const w = 5 + Math.sin(t * 2.1) * 4 + flap + bump(t % 7, 5, 1) * 14 * Math.abs(Math.sin(t * 20))
    setTransform('Wing L Pivot', { rotation: { x: 0, y: 0, z: -w } })
    setTransform('Wing R Pivot', { rotation: { x: 0, y: 0, z: w } })
    setTransform('Tail Pivot', { rotation: { x: Math.sin(t * 1.3) * 5 + b * 10, y: 0, z: 0 } })

    requestAnimationFrame(frame)
  }

  const FOV = 45
  const CAM_Z = 1000
  const ICON_PX = 62
  const BIRD_H = 140
  const BIRD_CY = 25
  let t0 = performance.now()

  async function initBird() {
    if (reduceMotion) return
    try {
      const { Application } = await import(SPLINE_RUNTIME)
      const app = new Application(canvas, {
        renderMode: 'continuous',
        renderer: 'webgl',
        htmlContentMode: 'none',
      })
      await app.load(SPLINE_SCENE)
      app.setBackgroundColor('rgba(0,0,0,0)')

      let found = 0
      for (const name of objectNames) {
        const object = app.findObjectByName(name)
        if (object) {
          objects[name] = object
          found += 1
        }
      }

      if (!objects['Cuckoo Root']) {
        console.warn('[Cuckoo AI] The Spline scene did not expose a "Cuckoo Root" object.')
        app.dispose?.()
        return
      }

      console.info('[Cuckoo AI] 3D bird ready (' + found + '/' + objectNames.length + ' parts).')
      stage.classList.add('ready')
      hit.classList.add('live')
      t0 = performance.now()
      requestAnimationFrame(frame)
    } catch (error) {
      console.warn('[Cuckoo AI] 3D bird could not load; using the icon launcher instead.', error)
    }
  }

  if (document.readyState === 'complete') initBird()
  else window.addEventListener('load', initBird, { once: true })
})()
