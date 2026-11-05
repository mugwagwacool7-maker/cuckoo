(() => {
  if (window.__cuckooAssistantLoaded) return
  window.__cuckooAssistantLoaded = true

  const CHAT_ENDPOINT = '/api/chat'
  const MAX_HISTORY = 12

  const host = document.createElement('div')
  host.id = 'cuckoo-assistant'
  document.body.append(host)

  const shadow = host.attachShadow({ mode: 'open' })

  shadow.innerHTML = `
    <style>
      :host {
        --green: #537b2f;
        --green-deep: #36501f;
        --green-dark: #283c17;
        --green-ink: #36501f;
        --gold: #e8a33d;
        --gold-deep: #a86415;
        --gold-soft: #f7e3bf;
        --paper: #fffdf9;
        --cream: #faf7f0;
        --ink: #16231d;
        --muted: #6b7568;
        --line: #e6ddc9;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
      }

      * { box-sizing: border-box; }

      #hit {
        position: fixed;
        right: 16px;
        bottom: calc(16px + var(--cuckoo-banner-offset, 0px));
        z-index: 2147482901;
        width: 80px;
        height: 80px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
      }
      .hit-core {
        position: relative;
        display: grid;
        width: 100%;
        height: 100%;
        place-items: center;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--green), var(--green-deep));
        box-shadow: 0 10px 26px rgb(54 80 31 / 22%), 0 0 0 4px rgb(255 253 249 / 24%);
        animation: hit-float 4.2s ease-in-out infinite;
        transition: transform .22s ease, box-shadow .22s ease;
      }
      .hit-core::before {
        content: "";
        display: block;
        width: 42px;
        height: 42px;
        background: url("/icon-192.png") center / contain no-repeat;
        filter: drop-shadow(0 3px 8px rgb(15 22 12 / 24%));
        animation: hit-breathe 4.2s ease-in-out infinite;
      }
      #hit:hover .hit-core {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 16px 32px rgb(54 80 31 / 28%), 0 0 0 4px rgb(255 253 249 / 32%);
      }
      #hit:active .hit-core { transform: scale(.96); }
      #hit:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }

      .hit-ring,
      .hit-ring::after {
        position: absolute;
        inset: 0;
        border: 2px solid rgb(232 163 61 / 55%);
        border-radius: 50%;
        pointer-events: none;
      }
      .hit-ring { animation: hit-pulse 3.4s cubic-bezier(.2, .6, .3, 1) infinite; }
      .hit-ring::after {
        content: "";
        animation: hit-pulse 3.4s cubic-bezier(.2, .6, .3, 1) 1.7s infinite;
      }

      .hit-spark {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gold);
        box-shadow: 0 0 8px 2px rgb(232 163 61 / 55%);
        opacity: 0;
        pointer-events: none;
      }
      .hit-spark.s1 { top: 4px; right: 11px; animation: hit-spark 4.2s ease-in-out infinite; }
      .hit-spark.s2 { bottom: 9px; left: 0; width: 4px; height: 4px; animation: hit-spark 4.2s ease-in-out -.9s infinite; }
      .hit-spark.s3 { top: 13px; left: -2px; width: 3px; height: 3px; animation: hit-spark 4.2s ease-in-out -2.1s infinite; }

      @keyframes hit-float {
        0%, 100% { translate: 0 0; }
        50% { translate: 0 -6px; }
      }
      @keyframes hit-breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
      }
      @keyframes hit-pulse {
        0% { transform: scale(1); opacity: .7; }
        70%, 100% { transform: scale(1.55); opacity: 0; }
      }
      @keyframes hit-spark {
        0%, 100% { opacity: 0; transform: translateY(0) scale(.4); }
        35% { opacity: 1; transform: translateY(-6px) scale(1); }
        70% { opacity: 0; transform: translateY(-13px) scale(.55); }
      }

      #tip {
        position: fixed;
        right: 110px;
        bottom: calc(34px + var(--cuckoo-banner-offset, 0px));
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
        bottom: calc(100px + var(--cuckoo-banner-offset, 0px));
        z-index: 2147483000;
        display: flex;
        flex-direction: column;
        width: 360px;
        max-width: calc(100vw - 32px);
        height: 520px;
        max-height: calc(100dvh - 120px - var(--cuckoo-banner-offset, 0px));
        overflow: hidden;
        border: 1px solid rgb(83 123 47 / 16%);
        border-radius: 22px;
        background: var(--paper);
        box-shadow: 0 24px 60px rgb(27 36 16 / 32%), 0 2px 8px rgb(27 36 16 / 10%);
        opacity: 0;
        transform: translateY(16px) scale(.96);
        transform-origin: bottom right;
        transition: opacity .25s ease, transform .3s cubic-bezier(.2, 1.3, .4, 1);
        pointer-events: none;
      }
      #chat.open { opacity: 1; transform: none; pointer-events: auto; }

      .head {
        position: relative;
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        overflow: hidden;
        padding: 15px 16px;
        background:
          radial-gradient(circle at 92% 140%, rgb(232 163 61 / 28%), transparent 58%),
          linear-gradient(135deg, var(--green-dark), var(--green-deep) 45%, var(--green));
        color: var(--paper);
      }
      .head::after {
        content: "";
        position: absolute;
        right: -34px;
        bottom: -86px;
        width: 168px;
        height: 168px;
        border: 1px solid rgb(255 253 249 / 12%);
        border-radius: 50%;
        pointer-events: none;
      }
      .brand {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }
      .avatar {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--paper) url("/icon-192.png") center / 74% no-repeat;
        box-shadow: 0 0 0 2px rgb(255 253 249 / 26%), 0 4px 12px rgb(16 24 12 / 24%);
        animation: avatar-glow 3.6s ease-in-out infinite;
      }
      @keyframes avatar-glow {
        0%, 100% {
          box-shadow: 0 0 0 2px rgb(255 253 249 / 26%), 0 4px 12px rgb(16 24 12 / 24%);
        }
        50% {
          box-shadow: 0 0 0 3px rgb(232 163 61 / 60%), 0 4px 18px rgb(232 163 61 / 40%);
        }
      }
      .id { min-width: 0; }
      .id b {
        display: block;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: .01em;
        line-height: 1.2;
      }
      .id small {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 3px;
        color: rgb(255 253 249 / 88%);
        font-size: 11.5px;
        line-height: 1.2;
        white-space: nowrap;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #8fe39b;
        box-shadow: 0 0 0 3px rgb(143 227 155 / 18%);
        animation: status-pulse 2.6s ease-in-out infinite;
      }
      @keyframes status-pulse {
        0%, 100% { box-shadow: 0 0 0 3px rgb(143 227 155 / 18%); }
        50% { box-shadow: 0 0 0 5px rgb(143 227 155 / 6%); }
      }

      #x {
        position: relative;
        z-index: 1;
        display: grid;
        flex: none;
        width: 30px;
        height: 30px;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgb(255 255 255 / 16%);
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-size: 19px;
        line-height: 1;
        transition: background .18s ease, transform .18s ease;
      }
      #x:hover { background: rgb(255 255 255 / 28%); transform: rotate(90deg); }
      #x:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

      #log {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        padding: 18px 16px 10px;
        background:
          radial-gradient(circle at 100% 0, rgb(232 163 61 / 8%), transparent 44%),
          var(--cream);
        scroll-behavior: smooth;
        scrollbar-color: rgb(83 123 47 / 26%) transparent;
        scrollbar-width: thin;
      }
      #log::-webkit-scrollbar { width: 8px; }
      #log::-webkit-scrollbar-thumb {
        border: 2px solid transparent;
        border-radius: 99px;
        background: rgb(83 123 47 / 26%);
        background-clip: padding-box;
      }

      .m {
        max-width: 84%;
        padding: 10px 13px;
        border-radius: 16px;
        font-size: 13.5px;
        line-height: 1.5;
        overflow-wrap: anywhere;
        animation: pop .24s ease both;
      }
      .m.bot {
        align-self: flex-start;
        border: 1px solid var(--line);
        border-bottom-left-radius: 5px;
        background: var(--paper);
        box-shadow: 0 2px 8px rgb(27 36 16 / 6%);
      }
      .m.me {
        align-self: flex-end;
        border-bottom-right-radius: 5px;
        background: linear-gradient(135deg, var(--green), var(--green-deep));
        color: var(--paper);
        white-space: pre-wrap;
        box-shadow: 0 4px 14px rgb(54 80 31 / 22%);
      }
      .m.error {
        border-color: #f0c7bd;
        background: #fff0ec;
        color: #8d3424;
      }
      .m p { margin: 0; }
      .m p + p { margin-top: .55em; }
      .m strong { font-weight: 650; }
      .m em { font-style: italic; }
      .m ul, .m ol { margin: .45em 0; padding-left: 1.15em; }
      .m li + li { margin-top: .25em; }
      .m .md-heading { font-weight: 650; }
      .m code {
        padding: 1px 5px;
        border-radius: 5px;
        background: rgb(83 123 47 / 10%);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: .92em;
      }
      .m a {
        color: var(--green-deep);
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .m.me a { color: var(--gold-soft); }

      .m.typing {
        display: inline-flex;
        gap: 5px;
        padding: 13px 14px;
      }
      .m.typing i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--green);
        animation: bl 1.2s ease-in-out infinite;
      }
      .m.typing i:nth-child(2) { animation-delay: .15s; }
      .m.typing i:nth-child(3) { animation-delay: .3s; }

      .starters {
        display: flex;
        flex: none;
        gap: 7px;
        overflow-x: auto;
        padding: 2px 16px 10px;
        background: var(--cream);
        scrollbar-width: none;
        transition: max-height .28s ease, opacity .2s ease, padding .28s ease;
      }
      .starters::-webkit-scrollbar { display: none; }
      .starters.hidden {
        max-height: 0;
        overflow: hidden;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
        pointer-events: none;
      }
      .chip {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--paper);
        color: var(--green-deep);
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
        box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
        transition: transform .16s ease, border-color .16s ease, background .16s ease;
      }
      .chip:hover {
        border-color: var(--gold);
        background: var(--gold-soft);
        transform: translateY(-1px);
      }
      .chip:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
      .chip-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--gold);
      }

      form {
        display: flex;
        flex: none;
        align-items: flex-end;
        padding: 10px 12px 12px;
        border-top: 1px solid var(--line);
        background: var(--paper);
      }
      .field {
        display: flex;
        flex: 1;
        align-items: flex-end;
        gap: 8px;
        min-width: 0;
        padding: 6px 6px 6px 14px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--paper);
        transition: border-color .18s ease, box-shadow .18s ease;
      }
      .field:focus-within {
        border-color: var(--gold);
        box-shadow: 0 0 0 3px rgb(232 163 61 / 16%);
      }
      textarea {
        flex: 1;
        min-width: 0;
        max-height: 104px;
        padding: 6px 0;
        border: 0;
        background: transparent;
        color: var(--ink);
        font: inherit;
        font-size: 13.5px;
        line-height: 1.4;
        outline: none;
        resize: none;
      }
      textarea::placeholder { color: #94a096; }
      #send {
        display: grid;
        flex: none;
        width: 34px;
        height: 34px;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--green);
        color: var(--paper);
        cursor: pointer;
        transition: background .18s ease, transform .18s ease, opacity .18s ease;
      }
      #send:hover:not(:disabled) { background: var(--green-deep); transform: scale(1.06); }
      #send:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
      #send:disabled { opacity: .45; cursor: not-allowed; }
      #send svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

      @keyframes pop {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: none; }
      }
      @keyframes bl {
        0%, 60%, 100% { opacity: .35; transform: translateY(0) scale(.85); }
        30% { opacity: 1; transform: translateY(-4px) scale(1.12); }
      }
      @media (max-width: 480px) {
        #chat {
          right: 8px;
          bottom: calc(92px + var(--cuckoo-banner-offset, 0px));
          width: calc(100vw - 16px);
          height: min(74dvh, 560px);
          max-height: calc(100dvh - 100px - var(--cuckoo-banner-offset, 0px));
          border-radius: 18px;
        }
        #hit { right: 12px; bottom: calc(12px + var(--cuckoo-banner-offset, 0px)); }
        #tip { right: 106px; bottom: calc(32px + var(--cuckoo-banner-offset, 0px)); }
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: .01ms !important;
          transition-duration: .01ms !important;
          scroll-behavior: auto !important;
        }
      }
    </style>

    <div id="tip">Ask Cuckoo AI</div>
    <button id="hit" type="button" aria-label="Ask Cuckoo AI" aria-expanded="false" aria-controls="chat">
      <span class="hit-ring" aria-hidden="true"></span>
      <span class="hit-core" aria-hidden="true"></span>
      <span class="hit-spark s1" aria-hidden="true"></span>
      <span class="hit-spark s2" aria-hidden="true"></span>
      <span class="hit-spark s3" aria-hidden="true"></span>
    </button>
    <section id="chat" role="dialog" aria-label="Cuckoo AI chat" aria-hidden="true">
      <div class="head">
        <div class="brand">
          <span class="avatar" aria-hidden="true"></span>
          <div class="id">
            <b>Cuckoo AI</b>
            <small><span class="dot"></span><span id="status">Your safari planning helper</span></small>
          </div>
        </div>
        <button id="x" type="button" aria-label="Close chat">&times;</button>
      </div>
      <div id="log" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="starters" id="starters" aria-label="Suggested questions"></div>
      <form id="f">
        <div class="field">
          <textarea id="q" rows="1" maxlength="1000" placeholder="Ask about safaris..." autocomplete="off" aria-label="Your message" required></textarea>
          <button id="send" type="submit" aria-label="Send message">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </form>
    </section>
  `

  const $ = (selector) => shadow.querySelector(selector)
  const hit = $('#hit')
  const tip = $('#tip')
  const chat = $('#chat')
  const log = $('#log')
  const starters = $('#starters')
  const status = $('#status')
  const form = $('#f')
  const input = $('#q')
  const closeButton = $('#x')
  const sendButton = $('#send')

  chat.inert = true

  const history = []
  const startersList = [
    ['Best time to visit', 'What is the best time of year to visit Victoria Falls?'],
    ['Popular safaris', 'Which safari packages are most popular?'],
    ['Plan my trip', 'Help me plan a safari trip.'],
    ['Talk to a guide', 'How can I contact a safari guide?'],
  ]
  let pending = false
  let open = false
  let bannerObserver

  function syncBannerOffset() {
    const banner = document.getElementById('cuckoo-cookie-banner')
    let height = 0
    if (banner) {
      const style = getComputedStyle(banner)
      const rect = banner.getBoundingClientRect()
      if (style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01) {
        height = Math.max(0, Math.round(rect.height))
      }
      if (bannerObserver && bannerObserver.target !== banner) {
        bannerObserver.observer.disconnect()
        bannerObserver = null
      }
      if (!bannerObserver && typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(syncBannerOffset)
        observer.observe(banner)
        bannerObserver = { target: banner, observer }
      }
    }
    host.style.setProperty('--cuckoo-banner-offset', height + 'px')
  }

  syncBannerOffset()
  window.addEventListener('resize', syncBannerOffset)
  new MutationObserver(syncBannerOffset).observe(document.body, { childList: true, subtree: true })
  window.setTimeout(syncBannerOffset, 400)
  window.setTimeout(syncBannerOffset, 1200)

  function scrollLog() {
    log.scrollTop = log.scrollHeight
  }

  function appendInline(parent, text) {
    const pattern = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|(?<![*\w])\*(?![\s*])[^*\n]+?(?<![\s*])\*(?![*\w])|(?<![_\w])_(?![\s_])[^_\n]+?(?<![\s_])_(?![_\w]))/g
    let lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parent.append(document.createTextNode(text.slice(lastIndex, match.index)))
      }

      const token = match[0]
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
      let element

      if (link) {
        element = document.createElement('a')
        element.href = link[2]
        element.textContent = link[1]
        element.target = '_blank'
        element.rel = 'noopener noreferrer'
      } else if (token.startsWith('**') || token.startsWith('__')) {
        element = document.createElement('strong')
        element.textContent = token.slice(2, -2)
      } else if (token.startsWith('`')) {
        element = document.createElement('code')
        element.textContent = token.slice(1, -1)
      } else {
        element = document.createElement('em')
        element.textContent = token.slice(1, -1)
      }

      parent.append(element)
      lastIndex = pattern.lastIndex
    }

    if (lastIndex < text.length) {
      parent.append(document.createTextNode(text.slice(lastIndex)))
    }
  }

  function renderRichText(container, text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n')
    let list = null
    let listType = ''

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+$/, '')

      if (!line.trim()) {
        list = null
        listType = ''
        continue
      }

      const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/)
      if (heading) {
        list = null
        listType = ''
        const element = document.createElement('p')
        element.className = 'md-heading'
        appendInline(element, heading[1].replace(/\s*#+\s*$/, ''))
        container.append(element)
        continue
      }

      const listItem = line.match(/^\s{0,3}(?:([*\-•])|(\d+)[.)])\s+(.*)$/)
      if (listItem) {
        const type = listItem[2] ? 'ol' : 'ul'
        if (!list || listType !== type) {
          list = document.createElement(type)
          list.className = 'md-list'
          container.append(list)
          listType = type
        }
        const item = document.createElement('li')
        appendInline(item, listItem[3])
        list.append(item)
        continue
      }

      list = null
      listType = ''
      const paragraph = document.createElement('p')
      appendInline(paragraph, line.replace(/^\s*>\s?/, '').trimStart())
      container.append(paragraph)
    }
  }

  function addMessage(text, who, isError = false) {
    const node = document.createElement('div')
    node.className = 'm ' + who + (isError ? ' error' : '')
    if (who === 'bot' && !isError) {
      renderRichText(node, text)
    } else {
      node.textContent = text
    }
    log.appendChild(node)
    scrollLog()
    return node
  }

  function addTyping() {
    const node = document.createElement('div')
    node.className = 'm bot typing'
    node.setAttribute('aria-label', 'Cuckoo is typing')
    node.innerHTML = '<i></i><i></i><i></i>'
    log.appendChild(node)
    scrollLog()
    return node
  }

  function buildStarters() {
    for (const [label, prompt] of startersList) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'chip'

      const dot = document.createElement('span')
      dot.className = 'chip-dot'
      dot.setAttribute('aria-hidden', 'true')

      button.append(dot, document.createTextNode(label))
      button.addEventListener('click', () => {
        hideStarters()
        send(prompt)
      })
      starters.appendChild(button)
    }
  }

  function hideStarters() {
    starters.classList.add('hidden')
    starters.setAttribute('aria-hidden', 'true')
    starters.inert = true
  }

  function greet() {
    addMessage("Hi, I'm Cuckoo, your safari planning assistant. Ask me about the best seasons, our favourite trips, or booking a guide.", 'bot')
  }

  async function requestReply(message) {
    if (!CHAT_ENDPOINT) {
      throw new Error('The assistant is not connected. Please try again later.')
    }

    let response
    try {
      response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(-MAX_HISTORY) }),
      })
    } catch {
      throw new Error('I could not connect to the assistant. Please try again in a moment.')
    }

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'The assistant request failed. Please try again.')
    }
    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('The assistant returned an empty reply. Please try again.')
    }
    return data.reply.trim()
  }

  function resizeInput() {
    input.style.height = 'auto'
    input.style.height = Math.min(input.scrollHeight, 104) + 'px'
  }

  async function send(raw) {
    const message = (raw || '').trim()
    if (!message || pending) return
    if (!open) toggle(true)
    hideStarters()

    addMessage(message, 'me')
    input.value = ''
    resizeInput()
    pending = true
    sendButton.disabled = true
    status.textContent = 'Cuckoo is thinking...'
    const typing = addTyping()

    let reply
    try {
      const results = await Promise.all([
        requestReply(message),
        new Promise((resolve) => window.setTimeout(resolve, 550)),
      ])
      reply = results[0]
    } catch (error) {
      typing.remove()
      addMessage(
        error instanceof Error ? error.message : 'I could not connect to the assistant. Please try again in a moment.',
        'bot',
        true,
      )
      pending = false
      sendButton.disabled = false
      status.textContent = 'Your safari planning helper'
      input.focus()
      return
    }

    typing.remove()
    addMessage(reply, 'bot')
    history.push({ role: 'user', text: message }, { role: 'model', text: reply })
    pending = false
    sendButton.disabled = false
    status.textContent = 'Your safari planning helper'
    input.focus()
  }

  function toggle(value) {
    open = value
    chat.classList.toggle('open', open)
    chat.inert = !open
    chat.setAttribute('aria-hidden', String(!open))
    hit.setAttribute('aria-expanded', String(open))
    if (open) {
      tip.classList.remove('show')
      if (!log.children.length) greet()
      window.setTimeout(() => input.focus(), 250)
    } else {
      hit.focus({ preventScroll: true })
    }
  }

  input.addEventListener('input', resizeInput)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      form.requestSubmit()
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (pending) return
    send(input.value)
  })

  closeButton.addEventListener('click', () => toggle(false))
  hit.addEventListener('click', () => toggle(!open))
  hit.addEventListener('mouseenter', () => { if (!open) tip.classList.add('show') })
  hit.addEventListener('mouseleave', () => tip.classList.remove('show'))
  hit.addEventListener('focus', () => { if (!open) tip.classList.add('show') })
  hit.addEventListener('blur', () => tip.classList.remove('show'))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) toggle(false)
  })

  buildStarters()

  window.setTimeout(() => {
    if (!open) {
      tip.classList.add('show')
      window.setTimeout(() => tip.classList.remove('show'), 4500)
    }
  }, 1800)

})()
