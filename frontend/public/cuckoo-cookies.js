(() => {
  const STORAGE_KEY = 'cuckoo-cookie-consent'
  const COOKIE_NAME = 'cuckoo_cookie_consent'
  const COOKIE_AGE = 60 * 60 * 24 * 365

  const readConsent = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) return stored
    } catch {}

    const match = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))

    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
  }

  const saveConsent = (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {}

    let cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${COOKIE_AGE}; Path=/; SameSite=Lax`
    if (window.location.protocol === 'https:') cookie += '; Secure'
    document.cookie = cookie
  }

  const removeBanner = (host) => {
    const card = host.shadowRoot?.querySelector('.card')
    if (!card) {
      host.remove()
      return
    }

    card.classList.add('is-leaving')
    window.setTimeout(() => host.remove(), 240)
  }

  const showBanner = () => {
    if (document.getElementById('cuckoo-cookie-banner')) return

    const host = document.createElement('div')
    host.id = 'cuckoo-cookie-banner'
    document.body.append(host)

    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 2147483001;
          left: 0;
          right: 0;
          bottom: 0;
          display: block;
          width: 100%;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        * { box-sizing: border-box; }

        .card {
          width: 100%;
          max-height: calc(100vh - 24px);
          overflow-y: auto;
          padding: 18px clamp(20px, 4vw, 48px);
          padding-bottom: calc(18px + env(safe-area-inset-bottom));
          border-top: 1px solid #e4e8de;
          background: #ffffff;
          color: #16231d;
          box-shadow: 0 -14px 40px rgb(27 36 16 / 14%);
          animation: cookie-in 260ms ease-out both;
        }

        .card.is-leaving {
          animation: cookie-out 220ms ease-in both;
        }

        .inner {
          display: flex;
          align-items: center;
          gap: 28px;
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .content {
          flex: 1 1 auto;
          min-width: 0;
        }

        .title {
          margin: 0 0 6px;
          color: #283c17;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }

        .text {
          max-width: 900px;
          margin: 0;
          color: #526057;
          font-size: 14px;
          line-height: 1.5;
        }

        .actions {
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          gap: 10px;
        }

        button {
          min-height: 44px;
          padding: 0 20px;
          border: 1px solid transparent;
          border-radius: 999px;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
        }

        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        button:focus-visible {
          outline: 3px solid #e8a33d;
          outline-offset: 3px;
        }

        .accept {
          background: #36501f;
          color: #ffffff;
        }

        .accept:hover { background: #283c17; }

        .essential {
          border-color: rgb(54 80 31 / 45%);
          background: #ffffff;
          color: #283c17;
        }

        .essential:hover {
          border-color: #36501f;
          background: #eef3e2;
        }

        @keyframes cookie-in {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cookie-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(100%); }
        }

        @media screen and (max-width: 800px) {
          .inner {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }

          .title { font-size: 15px; }
          .text { font-size: 13px; }
          .actions { width: 100%; }
          .actions button { flex: 1 1 160px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .card,
          .card.is-leaving { animation: none; }
          button { transition: none; }
        }
      </style>

      <section class="card" role="dialog" aria-live="polite" aria-label="Cookie consent">
        <div class="inner">
          <div class="content">
            <h2 class="title">We value your privacy</h2>
            <p class="text">
              We use cookies to keep the site working, understand how it is used, and improve your
              browsing experience. Choose whether to accept all cookies or essential cookies only.
            </p>
          </div>
          <div class="actions">
            <button class="accept" type="button">Accept all</button>
            <button class="essential" type="button">Essential only</button>
          </div>
        </div>
      </section>
    `

    shadow.querySelector('.accept').addEventListener('click', () => {
      saveConsent('accepted')
      removeBanner(host)
    })

    shadow.querySelector('.essential').addEventListener('click', () => {
      saveConsent('essential')
      removeBanner(host)
    })
  }

  const init = () => {
    if (!readConsent()) showBanner()

    window.cuckooCookieConsent = {
      show: showBanner,
      reset() {
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {}
        document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
        document.getElementById('cuckoo-cookie-banner')?.remove()
        showBanner()
      },
    }
  }

  if (document.body) init()
  else document.addEventListener('DOMContentLoaded', init, { once: true })
})()
