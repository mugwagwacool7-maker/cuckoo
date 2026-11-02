(() => {
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
        --on-green: #1b2410;
        --gold: #e8a33d;
        --paper: #fffdf9;
        --ink: #16231d;
        --muted: #68756e;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
      }

      * { box-sizing: border-box; }

      .launcher {
        position: fixed;
        z-index: 2147483000;
        right: 24px;
        bottom: 24px;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 58px;
        padding: 0 20px;
        border: 0;
        border-radius: 999px;
        background: var(--green);
        color: var(--paper);
        box-shadow: 0 10px 32px rgb(27 36 16 / 28%);
        cursor: pointer;
        font: inherit;
        font-size: 15px;
        font-weight: 600;
        line-height: 1;
        transition: transform 160ms ease, background 160ms ease, color 160ms ease;
      }

      .launcher:hover { background: var(--green-deep); color: var(--paper); transform: translateY(-2px); }
      .launcher:focus-visible, button:focus-visible, textarea:focus-visible {
        outline: 3px solid var(--gold);
        outline-offset: 3px;
      }

      .launcher-icon { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.8; }

      .panel {
        position: fixed;
        z-index: 2147483000;
        right: 24px;
        bottom: 94px;
        display: flex;
        flex-direction: column;
        width: min(380px, calc(100vw - 32px));
        height: min(560px, calc(100dvh - 120px));
        min-height: 340px;
        overflow: hidden;
        border: 1px solid rgb(83 123 47 / 24%);
        border-radius: 20px;
        background: var(--paper);
        box-shadow: 0 20px 60px rgb(27 36 16 / 24%);
      }

      .panel[hidden] { display: none; }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 20px;
        background: var(--green);
        color: var(--paper);
      }

      .brand { display: flex; align-items: center; gap: 12px; }
      .avatar {
        display: grid;
        width: 40px;
        height: 40px;
        place-items: center;
        border-radius: 50%;
        background: rgb(255 253 249 / 12%);
        color: var(--paper);
      }
      .avatar svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; }
      .title { margin: 0; font-size: 15px; font-weight: 650; }
      .subtitle { margin: 3px 0 0; color: var(--paper); font-size: 12px; }
      .close {
        display: grid;
        width: 36px;
        height: 36px;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--paper);
        cursor: pointer;
        font: inherit;
        font-size: 24px;
      }
      .close:hover { background: rgb(255 253 249 / 12%); }

      .messages {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        padding: 20px 16px;
        scroll-behavior: smooth;
      }

      .message {
        max-width: 88%;
        padding: 11px 14px;
        border-radius: 16px 16px 16px 4px;
        background: #f0f3ef;
        color: var(--ink);
        font-size: 14px;
        line-height: 1.5;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
      }
      .message.user {
        align-self: flex-end;
        border-radius: 16px 16px 4px 16px;
        background: var(--green);
        color: var(--paper);
      }
      .message.error { background: #fff0ec; color: #8d3424; }
      .message.thinking { display: flex; align-items: center; gap: 8px; color: var(--muted); }
      .message p { margin: 0; }
      .message p + p { margin-top: .55em; }
      .message .md-heading { font-weight: 650; }
      .message .md-list { margin: .4em 0; padding-left: 1.15em; }
      .message .md-list li + li { margin-top: .25em; }
      .message code {
        padding: 1px 5px;
        border-radius: 5px;
        background: rgb(0 0 0 / 7%);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: .92em;
      }
      .message a { color: var(--green-ink); text-decoration: underline; text-underline-offset: 2px; }
      .dots { display: inline-flex; gap: 3px; }
      .dots i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--muted);
        animation: pulse 1s ease-in-out infinite;
      }
      .dots i:nth-child(2) { animation-delay: 140ms; }
      .dots i:nth-child(3) { animation-delay: 280ms; }
      @keyframes pulse { 0%, 60%, 100% { opacity: .35; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }

      .suggestions { padding: 0 0 12px; }
      .suggestions[hidden] { display: none; }
      .suggestions-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px 8px;
      }
      .suggestions-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 650;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .suggestion-controls { display: flex; gap: 5px; }
      .suggestion-nav {
        display: grid;
        width: 28px;
        height: 28px;
        place-items: center;
        border: 1px solid #dce5de;
        border-radius: 50%;
        background: white;
        color: var(--green-ink);
        cursor: pointer;
        font: inherit;
        font-size: 16px;
        line-height: 1;
        transition: background 140ms ease, border-color 140ms ease, opacity 140ms ease;
      }
      .suggestion-nav:hover:not(:disabled) { border-color: var(--green-deep); background: #f0f3ef; }
      .suggestion-nav:disabled { opacity: .32; cursor: default; }
      .suggestion-track {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 0 16px 4px;
        scroll-behavior: smooth;
        scroll-padding-inline: 16px;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }
      .suggestion-track::-webkit-scrollbar { display: none; }
      .suggestion {
        display: flex;
        flex: 0 0 80%;
        flex-direction: column;
        gap: 3px;
        padding: 11px 13px;
        border: 1px solid #dce5de;
        border-radius: 14px;
        background: white;
        color: var(--green-ink);
        cursor: pointer;
        font: inherit;
        text-align: left;
        scroll-snap-align: start;
        transition: border-color 140ms ease, background 140ms ease;
      }
      .suggestion:hover { border-color: var(--green-deep); background: #f0f3ef; }
      .suggestion-title { font-size: 13px; font-weight: 600; line-height: 1.3; }
      .suggestion-detail { color: var(--muted); font-size: 11.5px; line-height: 1.35; }

      .composer {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #e8ece8;
        background: white;
      }
      textarea {
        flex: 1;
        min-width: 0;
        max-height: 100px;
        resize: none;
        padding: 10px 12px;
        border: 1px solid #dce5de;
        border-radius: 14px;
        background: white;
        color: var(--ink);
        font: inherit;
        font-size: 14px;
        line-height: 1.4;
      }
      textarea::placeholder { color: var(--muted); }
      .send {
        display: grid;
        flex: 0 0 40px;
        width: 40px;
        height: 40px;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: var(--green);
        color: var(--paper);
        cursor: pointer;
      }
      .send:disabled { background: #6b7568; cursor: not-allowed; }
      .send svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; }

      @media (max-width: 480px) {
        .launcher { right: 16px; bottom: 16px; }
        .panel { right: 8px; bottom: 82px; width: calc(100vw - 16px); height: min(600px, calc(100dvh - 100px)); }
        .suggestion { flex-basis: 86%; }
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
      }
    </style>
    <button class="launcher" type="button" aria-expanded="false" aria-controls="assistant-panel">
      <svg class="launcher-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg>
      <span>Ask Cuckoo</span>
    </button>
    <section class="panel" id="assistant-panel" role="dialog" aria-label="Cuckoo Safaris assistant" hidden>
      <header class="header">
        <div class="brand">
          <div class="avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/><path d="m19 14 1.2 3.8L24 19l-3.8 1.2L19 24l-1.2-3.8L14 19l3.8-1.2L19 14Z"/></svg></div>
          <div><p class="title">Cuckoo Safaris</p><p class="subtitle">Your safari planning assistant</p></div>
        </div>
        <button class="close" type="button" aria-label="Close assistant">&times;</button>
      </header>
      <div class="messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="suggestions">
        <div class="suggestions-head">
          <span class="suggestions-label">Suggested for you</span>
          <div class="suggestion-controls">
            <button class="suggestion-nav" type="button" data-dir="-1" aria-label="Previous suggestions">&#8249;</button>
            <button class="suggestion-nav" type="button" data-dir="1" aria-label="Next suggestions">&#8250;</button>
          </div>
        </div>
        <div class="suggestion-track"></div>
      </div>
      <form class="composer">
        <textarea rows="1" maxlength="1000" aria-label="Your message" placeholder="Ask us anything..." required></textarea>
        <button class="send" type="submit" aria-label="Send message">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
    </section>
  `

  const launcher = shadow.querySelector('.launcher')
  const panel = shadow.querySelector('.panel')
  const closeButton = shadow.querySelector('.close')
  const messagesElement = shadow.querySelector('.messages')
  const suggestions = shadow.querySelector('.suggestions')
  const suggestionTrack = shadow.querySelector('.suggestion-track')
  const suggestionNavButtons = shadow.querySelectorAll('.suggestion-nav')
  const form = shadow.querySelector('.composer')
  const input = shadow.querySelector('textarea')
  const sendButton = shadow.querySelector('.send')
  const history = []
  let pending = false

  const suggestionItems = [
    {
      title: 'Plan a Victoria Falls trip',
      detail: 'A relaxed 3-day itinerary',
      prompt: 'Help me plan a 3-day Victoria Falls trip.',
    },
    {
      title: 'Book a safari',
      detail: 'Share your dates and details',
      prompt: 'I want to book a safari. Please help me with the details.',
    },
    {
      title: 'Best time to visit',
      detail: 'Seasons, wildlife and water levels',
      prompt: 'What is the best time of year to visit Victoria Falls?',
    },
    {
      title: 'Day tours & activities',
      detail: 'Victoria Falls and around',
      prompt: 'What day tours and activities do you offer around Victoria Falls?',
    },
    {
      title: 'Help me choose a package',
      detail: 'Find the right safari for you',
      prompt: 'Can you help me choose the right safari package?',
    },
    {
      title: 'Talk to the team',
      detail: 'Contact Cuckoo Safaris',
      prompt: 'How can I contact the Cuckoo Safaris team?',
    },
  ]

  for (const item of suggestionItems) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'suggestion'

    const title = document.createElement('span')
    title.className = 'suggestion-title'
    title.textContent = item.title

    const detail = document.createElement('span')
    detail.className = 'suggestion-detail'
    detail.textContent = item.detail

    button.append(title, detail)
    button.addEventListener('click', () => {
      setOpen(true)
      void sendMessage(item.prompt)
    })
    suggestionTrack.append(button)
  }

  function updateSuggestionNav() {
    const maxScroll = suggestionTrack.scrollWidth - suggestionTrack.clientWidth - 1
    suggestionNavButtons.forEach((button) => {
      button.disabled = Number(button.dataset.dir) < 0
        ? suggestionTrack.scrollLeft <= 0
        : suggestionTrack.scrollLeft >= maxScroll
    })
  }

  function scrollSuggestions(direction) {
    const card = suggestionTrack.querySelector('.suggestion')
    const gap = 8
    const step = card ? card.getBoundingClientRect().width + gap : suggestionTrack.clientWidth
    suggestionTrack.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  suggestionNavButtons.forEach((button) => {
    button.addEventListener('click', () => scrollSuggestions(Number(button.dataset.dir)))
  })

  suggestionTrack.addEventListener('scroll', updateSuggestionNav, { passive: true })
  window.addEventListener('resize', updateSuggestionNav)

  function setOpen(isOpen) {
    panel.hidden = !isOpen
    launcher.setAttribute('aria-expanded', String(isOpen))
    if (isOpen) {
      input.focus()
      window.requestAnimationFrame(updateSuggestionNav)
    } else {
      launcher.focus()
    }
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

  function renderAssistantText(container, text) {
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

  function addMessage(role, text, isError = false) {
    const bubble = document.createElement('div')
    bubble.className = `message ${role}${isError ? ' error' : ''}`
    if (role === 'assistant' && !isError) {
      renderAssistantText(bubble, text)
    } else {
      bubble.textContent = text
    }
    messagesElement.append(bubble)
    messagesElement.scrollTop = messagesElement.scrollHeight
  }

  function showThinking() {
    const bubble = document.createElement('div')
    bubble.className = 'message thinking'
    bubble.setAttribute('aria-label', 'Thinking')
    bubble.innerHTML = 'Thinking <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>'
    messagesElement.append(bubble)
    messagesElement.scrollTop = messagesElement.scrollHeight
    return bubble
  }

  async function sendMessage(text) {
    if (pending) return

    pending = true
    input.disabled = true
    sendButton.disabled = true
    suggestions.hidden = true
    addMessage('user', text)
    input.value = ''
    const thinkingBubble = showThinking()

    try {
      const [response] = await Promise.all([
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: history.slice(-12) }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ])
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'The assistant is temporarily unavailable. Please try again.')
      }

      if (typeof result.reply !== 'string' || !result.reply.trim()) {
        throw new Error('The assistant could not answer that just now. Please try again.')
      }

      history.push({ role: 'user', text }, { role: 'model', text: result.reply })
      thinkingBubble.remove()
      addMessage('assistant', result.reply)
    } catch (error) {
      thinkingBubble.remove()
      const message = error instanceof Error && error.message !== 'Failed to fetch'
        ? error.message
        : 'Could not connect to the assistant. Please try again.'
      addMessage('assistant', message, true)
    } finally {
      pending = false
      input.disabled = false
      sendButton.disabled = false
      input.focus()
    }
  }

  launcher.addEventListener('click', () => setOpen(panel.hidden))
  closeButton.addEventListener('click', () => setOpen(false))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (text) void sendMessage(text)
  })

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      form.requestSubmit()
    }
  })

  updateSuggestionNav()

  addMessage('assistant', 'Hello! I can help you plan a safari, answer questions about Victoria Falls, or take your booking details. Where would you like to go?')
})()
