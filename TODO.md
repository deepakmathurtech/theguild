# TODO - Razorpay Production Fix

## Plan Steps
- [ ] 1) Add server/Express implementation of Razorpay endpoints:
  - POST /api/create-razorpay-order
  - POST /api/razorpay-webhook
  - (optional) POST /api/verify-razorpay-payment if needed
- [ ] 2) Add environment variables and document them.
- [ ] 3) Update frontend fetch error handling:
  - never call response.json() on empty/non-JSON
  - meaningful user-facing errors
  - ensure amount/currency validation
  - remove Razorpay test-key fallback
- [ ] 4) Ensure Vite dev-time proxy routes /api/* to the new server port.
- [ ] 5) Add Firestore writes only after verification:
  - if using webhook-driven updates, adjust frontend/backend registration flow.
- [ ] 6) Prevent duplicates (idempotency):
  - use payment_id / order_id uniqueness
  - use Firestore transaction or deterministic document IDs.
- [ ] 7) Update production readiness:
  - structured responses
  - status codes
  - logging
- [ ] 8) Run typecheck/lint/build and provide checklist.

