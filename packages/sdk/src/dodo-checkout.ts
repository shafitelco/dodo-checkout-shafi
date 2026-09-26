export interface CheckoutOptions {
  productId: string

  onSuccess?: (data: { sessionId: string }) => void

  onClose?: (data: { reason: 'user' }) => void

  onError?: (data: { code: string; message: string }) => void
}

type CheckoutMessage =
  | {
      type: 'DODO_READY'
    }
  | {
      type: 'PAYMENT_SUCCESS'
      sessionId: string
    }
  | {
      type: 'PAYMENT_ERROR'
      code: string
      message: string
    }
  | {
      type: 'CHECKOUT_CLOSE'
      reason: 'user'
    }
  | {
      type: 'DODO_ESCAPE'
    }

const CHECKOUT_URL = 'https://dodo-checkout-shafi.vercel.app'

const CHECKOUT_ORIGIN = new URL(CHECKOUT_URL).origin

let iframe: HTMLIFrameElement | null = null
let overlay: HTMLDivElement | null = null

let currentOptions: CheckoutOptions | null = null

let messageHandler: ((event: MessageEvent) => void) | null = null
let keydownHandler: ((event: KeyboardEvent) => void) | null = null

function cleanup () {
  if (messageHandler) {
    window.removeEventListener('message', messageHandler)
    messageHandler = null
  }

  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }

  if (overlay) {
    overlay.remove()
    overlay = null
  }

  iframe = null
  currentOptions = null

  document.body.style.overflow = ''
}

function createOverlay () {
  const element = document.createElement('div')

  element.style.position = 'fixed'
  element.style.inset = '0'
  element.style.zIndex = '999999'
  element.style.display = 'flex'
  element.style.alignItems = 'center'
  element.style.justifyContent = 'center'
  element.style.padding = '16px'
  element.style.background = 'rgba(15, 23, 42, 0.55)'
  element.style.backdropFilter = 'blur(4px)'

  return element
}

function createIframe () {
  const element = document.createElement('iframe')

  element.src = CHECKOUT_URL

  element.title = 'Dodo Checkout'

  element.allow = 'payment'

  element.style.width = '100%'
  element.style.maxWidth = '440px'
  element.style.height = 'min(720px, calc(100vh - 32px))'

  element.style.border = '0'
  element.style.borderRadius = '16px'
  element.style.background = '#ffffff'

  element.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.25)'

  return element
}

function handleMessage (event: MessageEvent<CheckoutMessage>) {
  // Never trust messages from unknown origins.
  if (event.origin !== CHECKOUT_ORIGIN) {
    return
  }

  // Only accept messages from our checkout iframe.
  if (!iframe || event.source !== iframe.contentWindow) {
    return
  }

  const message = event.data

  if (!message || typeof message.type !== 'string') {
    return
  }

  switch (message.type) {
    case 'DODO_READY': {
      iframe.contentWindow?.postMessage(
        {
          type: 'DODO_INIT',
          productId: currentOptions?.productId,
          parentOrigin: window.location.origin
        },
        CHECKOUT_ORIGIN
      )

      break
    }

    case 'PAYMENT_SUCCESS': {
      const options = currentOptions
      const sessionId = message.sessionId

      cleanup()

      options?.onSuccess?.({
        sessionId
      })

      break
    }

    case 'PAYMENT_ERROR': {
      currentOptions?.onError?.({
        code: message.code,
        message: message.message
      })

      break
    }

    case 'CHECKOUT_CLOSE': {
      currentOptions?.onClose?.({
        reason: message.reason
      })

      cleanup()

      break
    }
  }
}

function open (options: CheckoutOptions) {
  // Prevent opening multiple checkouts.
  if (iframe) {
    return
  }

  if (!options?.productId) {
    throw new Error('DodoCheckout.open requires a productId')
  }

  currentOptions = options

  overlay = createOverlay()
  iframe = createIframe()

  overlay.appendChild(iframe)
  document.body.appendChild(overlay)

  document.body.style.overflow = 'hidden'

  messageHandler = handleMessage

  window.addEventListener('message', messageHandler)

  keydownHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return
    }

    event.preventDefault()

    iframe?.contentWindow?.postMessage(
      {
        type: 'DODO_ESCAPE'
      },
      CHECKOUT_ORIGIN
    )
  }

  window.addEventListener('keydown', keydownHandler)

}

export const DodoCheckout = {
  open
}
