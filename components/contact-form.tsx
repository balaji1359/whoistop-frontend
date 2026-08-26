'use client'

import { useState } from 'react'

const FORM_ENDPOINT = 'https://api.w3forms.com/submit'

export function ContactForm() {
  const [status, setStatus] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('Sending…')
    const form = event.currentTarget
    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
    if (button) button.disabled = true

    const accessKey = process.env.NEXT_PUBLIC_W3FORMS_ACCESS_KEY
    if (!accessKey) {
      setStatus('Contact form is not configured yet.')
      if (button) button.disabled = false
      return
    }

    const formData = new FormData(form)
    formData.set('access_key', accessKey)

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
      const result = (await response.json()) as { success?: boolean; message?: string }
      if (response.ok && result.success) {
        setStatus('Thanks — your message was sent.')
        form.reset()
      } else {
        setStatus(result.message || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('Network error. Please try again.')
    } finally {
      if (button) button.disabled = false
    }
  }

  return (
    <form className="contact-form" id="w3forms-contact" onSubmit={handleSubmit}>
      <div className="contact-field">
        <label htmlFor="contact-name">Name</label>
        <input type="text" name="name" id="contact-name" required autoComplete="name" />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-email">Email</label>
        <input type="email" name="email" id="contact-email" required autoComplete="email" />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-message">Message</label>
        <textarea name="message" id="contact-message" required rows={6} />
      </div>
      <input type="hidden" name="subject" value="WhoIsTop.lol contact" />
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="contact-honeypot"
      />
      <div className="contact-actions">
        <button type="submit" className="btn btn-primary">
          Send message
        </button>
        {status ? (
          <p className="contact-status" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}
      </div>
    </form>
  )
}
