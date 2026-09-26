# Dodo Payments — Tiny Embeddable Checkout

**Submitted by:** Shafiulla Attar  
**Email:** shafiullaattar786@gmail.com
**Technology:** React, TypeScript, Vite, Tailwind CSS 

A small embeddable checkout experience built with **React, TypeScript, Vite, and Tailwind CSS**.

The project demonstrates how a merchant website can open a hosted checkout through a lightweight JavaScript/TypeScript SDK while keeping checkout data isolated from the merchant page.

---

## 1. Project Overview

This project contains three main pieces:

1. **Checkout SDK**
   - Provides the merchant-facing `DodoCheckout.open()` API.
   - Creates and manages the checkout iframe.
   - Handles communication between the merchant page and checkout.

2. **Hosted Checkout**
   - Runs as a separate web application.
   - Displays the checkout form.
   - Simulates payment processing using the provided test cards.
   - Handles success, failure, decline, retry, and validation states.

3. **Demo Merchant Website**
   - Represents a merchant integrating the SDK.
   - Provides a Buy button.
   - Displays a visible callback log showing events received from the checkout.

The implementation does not use a backend or real payment processing because this assignment only requires a frontend simulation.

---

# 2. Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- HTML iframe
- `window.postMessage`
- Browser APIs

---

# 3. Project Structure

```text
dodo-checkout/
│
├── apps/
│   │
│   ├── checkout/
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   └── ...
│   │   ├── package.json
│   │   └── ...
│   │
│   └── demo/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── dodo-checkout.ts
│       │   └── ...
│       ├── package.json
│       └── ...
│
├── packages/
│   └── sdk/
│       └── src/
│
├── README.md
└── ...
```

### `apps/checkout`

The hosted checkout application.

It is responsible for:

- Checkout UI
- Form state
- Test card handling
- Payment processing simulation
- Success/error states
- Retry behavior
- Communicating with the merchant SDK

### `apps/demo`

The demo merchant application.

It demonstrates how a merchant can integrate the SDK and react to:

- Successful payments
- Payment errors
- Checkout closing

### SDK

The SDK provides the merchant-facing API:

```ts
DodoCheckout.open({
  productId: "prod_123",

  onSuccess: ({ sessionId }) => {
    // Payment succeeded
  },

  onClose: ({ reason }) => {
    // Checkout closed
  },

  onError: ({ code, message }) => {
    // Payment failed
  }
})
```

---

# 4. Running the Project Locally

## Step 1 — Install dependencies

From the project root:

```bash
npm install
```

If the applications use separate dependencies, install them according to their respective `package.json` files.

---

## Step 2 — Start the Checkout App

Open a terminal:

```bash
cd apps/checkout
npm run dev
```

The checkout application runs at:

```text
http://localhost:5174
```

---

## Step 3 — Start the Demo App

Open a second terminal:

```bash
cd apps/demo
npm run dev
```

The demo application runs at:

```text
http://localhost:5173
```

---

## Step 4 — Open the Demo

Open:

```text
http://localhost:5173
```

Click:

```text
Buy Premium
```

The demo application opens the checkout inside an iframe overlay.

---

# 5. How the Checkout Works

The checkout uses a hosted iframe architecture.

The merchant page does not directly render the checkout form.

Instead:

```text
Merchant Page
      │
      │ DodoCheckout.open()
      ▼
     SDK
      │
      │ Creates iframe
      ▼
Checkout Application
      │
      │ postMessage
      ▼
     SDK
      │
      ├──────────────► onSuccess()
      │
      ├──────────────► onError()
      │
      └──────────────► onClose()
```

This gives the checkout its own DOM, CSS, JavaScript execution context, and origin.

---

# 6. SDK API

The main SDK API is:

```ts
DodoCheckout.open({
  productId: "prod_123",

  onSuccess: ({ sessionId }) => {
    console.log("Payment successful:", sessionId)
  },

  onClose: ({ reason }) => {
    console.log("Checkout closed:", reason)
  },

  onError: ({ code, message }) => {
    console.log("Payment error:", code, message)
  }
})
```

## `productId`

Identifies the product being purchased.

Example:

```ts
productId: "prod_123"
```

---

## `onSuccess`

Called when the simulated payment succeeds.

Example:

```ts
onSuccess: ({ sessionId }) => {
  console.log("Payment successful:", sessionId)
}
```

The checkout generates a session ID for successful payments.

Example:

```text
sess_abc123...
```

---

## `onError`

Called when the payment fails or is declined.

Example:

```ts
onError: ({ code, message }) => {
  console.log(code, message)
}
```

Example error codes include:

```text
PAYMENT_DECLINED
PAYMENT_FAILED
INVALID_TEST_CARD
```

---

## `onClose`

Called when the user manually closes the checkout.

Example:

```ts
onClose: ({ reason }) => {
  console.log("Checkout closed:", reason)
}
```

Currently the SDK exposes:

```ts
reason: "user"
```

A successful payment intentionally triggers `onSuccess` rather than `onClose`.

This keeps the merchant callback behavior unambiguous.

---

# 7. Communication Between Host and Checkout

The merchant application and checkout application are running on different origins.

The communication therefore uses:

```ts
window.postMessage()
```

The checkout first announces that it is ready:

```text
DODO_READY
```

The SDK responds with:

```text
DODO_INIT
```

The initialization message contains:

```text
productId
parentOrigin
```

After initialization, the checkout can communicate payment results back to the SDK.

---

## Message Flow

```text
Checkout
   │
   │ DODO_READY
   ▼
SDK
   │
   │ DODO_INIT
   │ productId
   │ parentOrigin
   ▼
Checkout
   │
   ├── PAYMENT_SUCCESS
   │
   ├── PAYMENT_ERROR
   │
   └── CHECKOUT_CLOSE
   ▼
SDK
   │
   └── Merchant callback
```

---

# 8. Security Boundary

One of the main design goals is keeping payment information inside the checkout.

The checkout is isolated inside an iframe.

The merchant page never receives:

- Card number
- Expiry date
- CVC

The SDK only exposes payment results through callbacks.

For example:

```ts
onSuccess({ sessionId })
```

rather than exposing card information.

---

## Origin Validation

The SDK does not blindly accept messages from any window.

Incoming messages are checked against the configured checkout origin:

```ts
if (event.origin !== CHECKOUT_ORIGIN) {
  return
}
```

The SDK also verifies that the message came from the currently active checkout iframe:

```ts
if (!iframe || event.source !== iframe.contentWindow) {
  return
}
```

This prevents unrelated windows from sending fake checkout messages to the merchant page.

---

## Targeted `postMessage`

Messages sent from the SDK to the checkout use the known checkout origin:

```ts
iframe.contentWindow?.postMessage(
  message,
  CHECKOUT_ORIGIN
)
```

The checkout also receives the merchant origin during initialization and uses that origin when sending payment results back.

This avoids using a broad `'*'` target for normal payment result messages.

---

# 9. Payment States

The checkout maintains explicit payment states:

```text
idle
  ↓
processing
  ↓
success
```

or:

```text
idle
  ↓
processing
  ↓
error
  ↓
retry
  ↓
processing
```

The main states are:

```ts
type PaymentStatus =
  | "idle"
  | "processing"
  | "success"
  | "error"
```

This makes the payment behavior predictable and prevents duplicate submissions.

---

# 10. Duplicate Click Protection

The Pay button cannot trigger another payment while a payment is already processing.

This prevents multiple simulated payment attempts from being started by repeated clicks.

The checkout also prevents the merchant from opening multiple checkout iframes at the same time.

For example:

```ts
if (iframe) {
  return
}
```

This keeps the checkout lifecycle controlled.

---

# 11. Test Cards

The assignment-provided test cards are implemented.

## Successful Payment

```text
4242 4242 4242 4242
```

Expected result:

```text
PAYMENT_SUCCESS
        ↓
onSuccess()
```

A session ID is returned.

---

## Declined Payment

```text
4000 0000 0000 0002
```

Expected result:

```text
PAYMENT_ERROR
        ↓
PAYMENT_DECLINED
```

The checkout remains open so the user can try again.

---

## Temporary Failure

```text
4000 0000 0000 0341
```

Expected behavior:

```text
First attempt
     ↓
PAYMENT_ERROR
     ↓
Retry
     ↓
PAYMENT_SUCCESS
```

The first attempt fails and the retry succeeds.

---

## Invalid Test Card

Any unsupported card number is treated as an invalid test card.

Expected result:

```text
PAYMENT_ERROR
        ↓
INVALID_TEST_CARD
```

---

# 12. Validation and Error States

The checkout handles invalid or incomplete form submissions before attempting payment processing.

Examples include:

- Missing email
- Missing card number
- Missing expiry
- Missing CVC
- Unsupported test card

The checkout displays an appropriate error state rather than silently failing.

Payment errors also remain inside the checkout so that the user can retry.

---

# 13. Checkout Close Behavior

The checkout can be closed using:

- Close button
- Escape key

The Escape key is handled by the SDK and communicated to the checkout using:

```text
DODO_ESCAPE
```

The checkout then sends:

```text
CHECKOUT_CLOSE
```

which results in:

```ts
onClose({
  reason: "user"
})
```

The SDK then removes the iframe and restores the merchant page.

---

# 14. Merchant Callback Log

The demo application includes a visible callback log.

This is useful for showing exactly what the merchant receives from the checkout.

Example:

```text
checkout.opened
payment.success · sess_...
payment.error · PAYMENT_DECLINED
checkout.closed · user
```

The log makes the communication between the checkout SDK and merchant application visible during testing.

---

# 15. Key Design Decisions

## Decision 1 — Use an iframe for the checkout

I chose a cross-origin iframe instead of injecting the checkout UI directly into the merchant DOM.

### Why?

The iframe provides a clear boundary between:

```text
Merchant Application
```

and:

```text
Checkout Application
```

This helps isolate:

- Checkout CSS
- Checkout JavaScript
- Checkout DOM
- Card input

Communication is limited to an explicit `postMessage` contract.

This also makes the architecture closer to how a hosted payment checkout can be integrated into an existing website.

---

## Decision 2 — Keep payment results separate from checkout closing

I intentionally treat payment success and user closing as different events.

A successful payment triggers:

```ts
onSuccess()
```

A manual close triggers:

```ts
onClose()
```

A successful payment does not also trigger:

```ts
onClose()
```

This avoids making the merchant determine whether a close event was actually a successful payment.

The result of the payment is therefore explicit.

---

# 16. What I Would Explore Next

If this were developed beyond the assignment, I would explore:

### SDK Packaging

Publish the SDK as a reusable package instead of importing the source directly.

For example:

```text
@dodo/checkout
```

---

### Environment Configuration

Support different checkout environments:

```text
development
staging
production
```

instead of hardcoding the checkout URL.

---

### Runtime Message Validation

Add stronger runtime validation for incoming `postMessage` payloads.

For example:

- Validate message structure
- Validate required fields
- Reject unexpected values
- Version the message protocol

---

### Real Payment Backend

Replace the simulated payment flow with a backend-created payment session.

The production flow could become:

```text
Merchant
   ↓
Backend
   ↓
Payment Session
   ↓
Checkout
   ↓
Payment Provider
```

---

### Automated Tests

Add unit and integration tests for:

- SDK lifecycle
- Message validation
- Payment states
- Retry behavior
- Duplicate clicks
- Callback behavior

---

### Accessibility

Perform more extensive accessibility testing for:

- Keyboard navigation
- Screen readers
- Focus trapping
- Focus restoration
- Error announcements
- Form labels

---

### Production Security

For a production payment integration I would additionally evaluate:

- Content Security Policy
- Frame restrictions
- Trusted origins
- Secure deployment
- HTTPS-only communication
- Additional message validation
- Monitoring and error tracking

---

# 17. Assignment Coverage

The implementation covers the main assignment requirements:

- [x] TypeScript checkout SDK
- [x] `DodoCheckout.open()` API
- [x] Hosted checkout application
- [x] Cross-origin iframe integration
- [x] Fake payment processing
- [x] Success state
- [x] Declined payment
- [x] Transient failure and retry
- [x] Invalid test card handling
- [x] Loading/processing state
- [x] Error states
- [x] Duplicate payment protection
- [x] Duplicate checkout protection
- [x] Merchant callback log
- [x] `postMessage` communication
- [x] Origin validation
- [x] Card-data isolation from merchant page
- [x] Escape-to-close
- [x] README documentation

---

# 18. Summary

This project focuses on building a small but complete checkout integration rather than a large payment system.

The core architecture is:

```text
                    ┌─────────────────────┐
                    │   Demo Merchant     │
                    │                     │
                    │  Buy Premium        │
                    │  Callback Log       │
                    └──────────┬──────────┘
                               │
                               │
                        DodoCheckout
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Checkout iframe   │
                    │                     │
                    │  Email              │
                    │  Card               │
                    │  Expiry             │
                    │  CVC                │
                    │                     │
                    │  Fake Payment       │
                    └─────────────────────┘
                               │
                               │ postMessage
                               ▼
                    Success / Error / Close
```

The main engineering focus is keeping the integration simple for the merchant while maintaining a clear boundary between the merchant application and checkout.