# TODO: Fix Certificate PDF not attached in email

## Steps

### Step 1: Install `jspdf` package
- [x] Install jspdf in the project

### Step 2: Modify `api/send-email.ts`
- [x] Accept optional `attachments` array in the request body
- [x] Forward attachments to the Resend API

### Step 3: Modify `src/eventsite/lib/firestoreEvents.ts` — `queueCertificateEmail()`
- [x] Accept optional `attachments` parameter
- [x] Forward attachments to `/api/send-email`

### Step 4: Modify `src/eventsite/components/CertificatePreviewModal.tsx`
- [x] Generate PDF from canvas image on send
- [x] Pass PDF attachment back via `onSendComplete`

### Step 5: Modify `src/eventsite/pages/Certificates.tsx`
- [x] Pass certificate PDF attachment when queueing email
- [x] Update `handleModalSendComplete` to include attachment
- [x] Update `handleResendEmail` to generate and include PDF attachment

### Step 6: Create shared `certificatePdfGenerator.ts`
- [x] Extracted standalone canvas rendering + PDF generation logic
- [x] Reused by both `CertificatePreviewModal` (initial send) and `Certificates.tsx` (resend)

## Summary of Changes
✅ All steps completed. The certificate PDF is now properly generated and attached to the email:
- **Initial send** via Preview Modal → PDF attached ✓
- **Resend** via Resend button → PDF attached (when template exists) ✓

