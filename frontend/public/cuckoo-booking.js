(() => {
  if (window.__cuckooBookingLoaded) return
  window.__cuckooBookingLoaded = true

  const WHATSAPP_NUMBER = '263712154201'
  const EMAIL = 'info@cuckoosafaris.com'
  const CONTACT_ANCHOR = 'Contact'

  const inSubdirectory = /\/(destination|package)\//.test(location.pathname)
  const contactPath = inSubdirectory ? '../contact.html' : 'contact.html'

  function isContactPage() {
    return /contact\.html$/i.test(location.pathname) || /\/contact\/?$/i.test(location.pathname)
  }

  function pageTripName() {
    const heading = document.querySelector('.inner-hero-heading')
    if (!heading) return ''
    return heading.textContent.replace(/\s+/g, ' ').trim()
  }

  function bookingUrl(trip) {
    if (isContactPage()) return `#${CONTACT_ANCHOR}`
    const hash = `#${CONTACT_ANCHOR}`
    if (!trip) return `${contactPath}${hash}`
    return `${contactPath}?trip=${encodeURIComponent(trip)}${hash}`
  }

  function addNavButton() {
    const navs = document.querySelectorAll('.nav-link-wrap')
    navs.forEach((nav) => {
      if (nav.querySelector('.cuckoo-nav-book')) return
      const link = document.createElement('a')
      link.className = 'navlink cuckoo-nav-book'
      link.href = bookingUrl(isContactPage() ? '' : pageTripName())
      link.textContent = 'Book Now'
      nav.append(link)
    })
  }

  function addDetailButton() {
    if (!/\/(destination|package)\//.test(location.pathname)) return
    const trip = pageTripName()
    if (!trip) return

    const link = document.createElement('a')
    link.className = 'cuckoo-book-btn'
    link.href = bookingUrl(trip)
    link.innerHTML = '<span>Book This Trip</span><span aria-hidden="true">&rarr;</span>'

    const heroButtons = document.querySelector('.inner-button-wrap')
    if (heroButtons) {
      if (!heroButtons.querySelector('.cuckoo-book-btn')) heroButtons.append(link)
      return
    }

    const heroRight = document.querySelector('.destination-hero-right')
    if (heroRight && !heroRight.querySelector('.cuckoo-book-btn')) heroRight.append(link)
  }

  function formatDate(value) {
    if (!value) return ''
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function fieldValue(selector) {
    const field = document.querySelector(selector)
    return field && 'value' in field ? field.value.trim() : ''
  }

  function collectData() {
    return {
      firstName: fieldValue('#name'),
      lastName: fieldValue('#Last-Name'),
      email: fieldValue('#Email'),
      phone: fieldValue('#Phone'),
      date: fieldValue('#Travel-Dat'),
      travelers: fieldValue('#Travelers'),
      trip: fieldValue('#Trip-Types'),
      budget: fieldValue('#Estimated-Budget'),
      notes: fieldValue('#field'),
    }
  }

  function buildMessage(data) {
    const lines = ['New safari booking request', '']
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ')

    if (name) lines.push(`Name: ${name}`)
    if (data.email) lines.push(`Email: ${data.email}`)
    if (data.phone) lines.push(`Phone / WhatsApp: ${data.phone}`)
    if (data.date) lines.push(`Travel date: ${formatDate(data.date)}`)
    if (data.travelers) lines.push(`Travelers: ${data.travelers}`)
    if (data.trip) lines.push(`Trip: ${data.trip}`)
    if (data.budget) lines.push(`Budget: ${data.budget}`)
    if (data.notes) lines.push(`Notes: ${data.notes}`)

    lines.push('', 'Sent from cuckoosafaris.com')
    return lines.join('\n')
  }

  function emailUrl(data) {
    const message = buildMessage(data)
    const subject = `Safari booking request${data.trip ? ` - ${data.trip}` : ''}`
    return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
  }

  function whatsappUrl(data) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(data))}`
  }

  function showStatus(text, fallbackUrl) {
    let status = document.querySelector('#cuckoo-booking-status')
    if (!status) {
      status = document.createElement('p')
      status.id = 'cuckoo-booking-status'
      status.className = 'cuckoo-booking-status'
      status.setAttribute('role', 'status')
      const form = document.querySelector('#email-form')
      if (form && form.parentNode) form.parentNode.insertBefore(status, form.nextSibling)
      else document.body.append(status)
    }

    status.textContent = text
    if (fallbackUrl) {
      const link = document.createElement('a')
      link.href = fallbackUrl
      link.textContent = ' Send by email instead'
      status.append(link)
    }
  }

  function initContactForm() {
    const form = document.querySelector('#email-form')
    if (!form) return

    const trip = new URLSearchParams(location.search).get('trip')
    const tripField = document.querySelector('#Trip-Types')
    if (trip && tripField && !tripField.value) tripField.value = trip

    const emailButton = document.querySelector('#cuckoo-email-btn')
    if (emailButton) {
      emailButton.addEventListener('click', () => {
        if (!form.reportValidity()) return
        window.location.href = emailUrl(collectData())
      })
    }

    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!form.reportValidity()) return

        const data = collectData()
        window.open(whatsappUrl(data), '_blank', 'noopener')
        showStatus(
          'WhatsApp opened with your booking request. If it did not open, use the email option.',
          emailUrl(data),
        )
      },
      true,
    )

    if (trip || location.hash.toLowerCase() === '#contact') {
      window.setTimeout(() => {
        const section = document.querySelector(`#${CONTACT_ANCHOR}`)
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (tripField) tripField.focus({ preventScroll: true })
      }, 400)
    }
  }

  function init() {
    addNavButton()
    addDetailButton()
    if (isContactPage()) initContactForm()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
