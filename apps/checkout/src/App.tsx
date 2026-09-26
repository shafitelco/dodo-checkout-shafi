import { useEffect, useRef, useState } from 'react'

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error'

type ErrorType = 'declined' | 'failed' | 'validation' | null

function App () {
  const [email, setEmail] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [errorType, setErrorType] = useState<ErrorType>(null)

  const [transientFailureUsed, setTransientFailureUsed] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [parentOrigin, setParentOrigin] = useState<string | null>(null)

  const sendMessage = (message: unknown) => {
    if (!parentOrigin) {
      return
    }

    window.parent.postMessage(message, parentOrigin)
  }

  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'DODO_READY'
      },
      '*'
    )

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return
      }

      // Handle Escape request from SDK
      if (event.data?.type === 'DODO_ESCAPE') {
        if (status !== 'processing') {
          handleClose()
        }

        return
      }

      // Handle checkout initialization
      if (event.data?.type !== 'DODO_INIT') {
        return
      }

      if (
        typeof event.data.parentOrigin !== 'string' ||
        event.data.parentOrigin !== event.origin
      ) {
        return
      }

      setParentOrigin(event.data.parentOrigin)

      setTimeout(() => {
        emailRef.current?.focus()
      }, 0)
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [status])

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)

    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const handleCardChange = (value: string) => {
    setCardNumber(formatCardNumber(value))
  }

  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)

    if (digits.length <= 2) {
      setExpiry(digits)
      return
    }

    setExpiry(`${digits.slice(0, 2)} / ${digits.slice(2)}`)
  }

  const handlePayment = () => {
    if (status === 'processing') {
      return
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, '')

    if (!email || !cleanCardNumber || !expiry || !cvc) {
      setErrorType('validation')
      setStatus('error')
      return
    }

    setStatus('processing')
    setErrorType(null)

    setTimeout(() => {
      // 1. Successful card
      if (cleanCardNumber === '4242424242424242') {
        const newSessionId = `sess_${crypto.randomUUID()}`

        setSessionId(newSessionId)

        sendMessage({
          type: 'PAYMENT_SUCCESS',
          sessionId: newSessionId
        })

        setStatus('success')

        return
      }

      // 2. Always declined
      if (cleanCardNumber === '4000000000000002') {
        sendMessage({
          type: 'PAYMENT_ERROR',
          code: 'PAYMENT_DECLINED',
          message: 'Your card was declined.'
        })

        setErrorType('declined')
        setStatus('error')
        return
      }

      // 3. Fails once, succeeds on retry
      if (cleanCardNumber === '4000000000000341') {
        if (!transientFailureUsed) {
          setTransientFailureUsed(true)

          sendMessage({
            type: 'PAYMENT_ERROR',
            code: 'PAYMENT_FAILED',
            message: "We couldn't complete the payment."
          })

          setErrorType('failed')
          setStatus('error')
          return
        }

        // Second attempt succeeds
        const newSessionId = `sess_${crypto.randomUUID()}`

        setSessionId(newSessionId)

        sendMessage({
          type: 'PAYMENT_SUCCESS',
          sessionId: newSessionId
        })

        setStatus('success')
        return
      }

      // 4. Any unsupported card
      sendMessage({
        type: 'PAYMENT_ERROR',
        code: 'INVALID_TEST_CARD',
        message: 'Please use one of the supported test cards.'
      })

      setErrorType('failed')
      setStatus('error')
    }, 1500)
  }

  const handleClose = () => {
    sendMessage({
      type: 'CHECKOUT_CLOSE',
      reason: 'user'
    })
  }

  const handleRetry = () => {
    setStatus('idle')
    setErrorType(null)
  }

  if (status === 'success') {
    return (
      <div className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
        <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center'>
          <div className='mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700'>
            ✓
          </div>

          <h1 className='text-2xl font-semibold text-slate-900'>
            Payment successful
          </h1>

          <p className='mt-2 text-sm text-slate-500'>
            Your payment has been completed successfully.
          </p>

          <div className='mt-6 rounded-xl bg-slate-50 p-4 text-left'>
            <p className='text-xs text-slate-500'>Session ID</p>

            <p className='mt-1 font-mono text-sm text-slate-800'>{sessionId}</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    const isDeclined = errorType === 'declined'
    const isValidation = errorType === 'validation'

    return (
      <div className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
        <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-xl'>
          <div className='mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-xl text-red-600'>
            !
          </div>

          <div className='text-center'>
            <h1 className='text-2xl font-semibold text-slate-900'>
              {isDeclined
                ? 'Payment declined'
                : isValidation
                ? 'Missing payment details'
                : 'Something went wrong'}
            </h1>

            <p className='mt-2 text-sm leading-6 text-slate-500'>
              {isDeclined
                ? 'Your card was declined. Check your details or try another card.'
                : isValidation
                ? 'Please fill in all payment details and try again.'
                : "We couldn't complete the payment. Please try again."}
            </p>
          </div>

          <button
            type='button'
            onClick={handleRetry}
            className='mt-6 w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800'
          >
            Try again
          </button>

          <p className='mt-4 text-center text-xs text-slate-400'>
            Test mode · No real payment was made
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
      <div className='w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl'>
        {/* Header */}
        <div className='border-b border-slate-200 px-6 py-5'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-slate-500'>
                Dodo Checkout
              </p>

              <h1 className='mt-1 text-xl font-semibold text-slate-900'>
                Premium Plan
              </h1>
            </div>

            <button
              type='button'
              onClick={handleClose}
              disabled={status === 'processing'}
              className='flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'
              aria-label='Close checkout'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden='true'
              >
                <path d='M18 6 6 18' />
                <path d='m6 6 12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Product */}
        <div className='px-6 py-5'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className='text-sm font-medium text-slate-900'>
                Premium Developer Plan
              </p>

              <p className='mt-1 text-sm text-slate-500'>
                Everything you need to get started.
              </p>
            </div>

            <p className='shrink-0 text-lg font-semibold text-slate-900'>
              $49.00
            </p>
          </div>
        </div>

        {/* Form */}
        <div className='space-y-5 px-6 pb-6'>
          {/* Email */}
          <div>
            <label
              htmlFor='email'
              className='mb-2 block text-sm font-medium text-slate-700'
            >
              Email
            </label>

            <input
              ref={emailRef}
              id='email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='you@example.com'
              className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
            />
          </div>

          {/* Card */}
          <div>
            <label
              htmlFor='card'
              className='mb-2 block text-sm font-medium text-slate-700'
            >
              Card number
            </label>

            <input
              id='card'
              type='text'
              inputMode='numeric'
              value={cardNumber}
              onChange={e => handleCardChange(e.target.value)}
              placeholder='4242 4242 4242 4242'
              maxLength={19}
              className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
            />
          </div>

          {/* Expiry + CVC */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='expiry'
                className='mb-2 block text-sm font-medium text-slate-700'
              >
                Expiry
              </label>

              <input
                id='expiry'
                type='text'
                value={expiry}
                onChange={e => handleExpiryChange(e.target.value)}
                placeholder='MM / YY'
                inputMode='numeric'
                maxLength={7}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
              />
            </div>

            <div>
              <label
                htmlFor='cvc'
                className='mb-2 block text-sm font-medium text-slate-700'
              >
                CVC
              </label>

              <input
                id='cvc'
                type='password'
                inputMode='numeric'
                value={cvc}
                onChange={e =>
                  setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder='123'
                maxLength={4}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
              />
            </div>
          </div>

          {/* Pay */}
          <button
            type='button'
            onClick={handlePayment}
            disabled={status === 'processing' || !parentOrigin}
            className='w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {status === 'processing' ? 'Processing payment...' : 'Pay $49.00'}
          </button>

          {/* Security */}
          <div className='flex items-center justify-center gap-2 text-xs text-slate-400'>
            <span>🔒</span>
            <span>Secure checkout · Test mode</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
