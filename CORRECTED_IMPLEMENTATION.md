# Corrected Multi-Party Routing & Templates Implementation

## Architecture Overview

### Feature 1: Multi-Party Routing (Send for Signature)

**Database Schema:**
- `signature_requests.json` stores SignatureRequest objects
- Each request has: documentId, signerEmail, signerName, status (pending/viewed/signed), order, accessToken (UUID)

**Backend Endpoints:**
- `POST /api/documents/{id}/send-for-signature` - Creates signature requests and sends emails
- `GET /api/sign/{accessToken}` - Loads document for signer (no login required)
- `POST /api/sign/{accessToken}/submit` - Submits signatures

**Frontend Flow:**
1. Document owner adds recipients (name + email) in editor
2. Assigns fields to specific recipients using dropdown UNDER each field box
3. Clicks "Send for Signing" - opens modal showing recipients
4. Backend generates unique access tokens and sends emails
5. Recipients click link → `/sign/{accessToken}` → see only their fields
6. After signing, backend checks if all signed → sends final PDF to everyone

### Feature 2: Templates (To Be Implemented)

**Database Schema:**
- Templates stored with role-based fields (e.g., "Contractor", "Manager")
- TemplateField has `role` instead of `recipientId`

**Backend Endpoints:**
- `POST /api/templates` - Create template
- `GET /api/templates` - List templates
- `POST /api/templates/{id}/instantiate` - Create document from template with role→email mapping

**Frontend Flow:**
1. Create template mode - assign fields to roles (not people)
2. Use template - map roles to actual emails
3. Backend copies template, replaces roles with recipients, sends for signature

## Key Changes Made

### 1. Fixed Field Assignment UI
- Recipient dropdown now appears UNDER the field box (not inside)
- Positioned using absolute positioning relative to field coordinates
- Styled with `.field-recipient-dropdown` class

### 2. Simplified Document Types
- Only two types: `document` and `template`
- Removed confusing `multi-sign` type
- All documents support multiple recipients by default

### 3. Access Token System
- Replaced complex signing tokens with simple UUID access tokens
- Each recipient gets unique token in email
- Token maps to specific signer email
- Backend filters fields by recipient when loading

### 4. Dashboard Tabs
- **Documents**: All regular documents (draft/sent/completed)
- **Templates**: Reusable templates with role-based fields
- Progress bar shows signature completion for sent documents

### 5. Email Integration
- Single endpoint handles token generation + email sending
- No browser prompts - all recipients added programmatically
- Final PDF automatically emailed when all sign

## Files Modified

### Backend:
- `backend/app.py` - New signature request architecture
- `backend/.env` - Email credentials configured
- `backend/email_service.py` - Default credentials added

### Frontend:
- `src/app/models/document.model.ts` - New data models
- `src/app/services/api.service.ts` - New API methods
- `src/app/services/document.service.ts` - Updated recipient model
- `src/app/home/home.ts` - Simplified send logic
- `src/app/home/home.html` - Dropdown under field box
- `src/app/home/home.css` - New dropdown styles
- `src/app/sign/sign.ts` - Access token system
- `src/app/dashboard/dashboard.ts` - Two-tab system
- `src/app/dashboard/dashboard.html` - Updated tabs

## Testing Steps

1. Start backend: `cd backend && python app.py`
2. Start frontend: `ng serve`
3. Login: demo@example.com / demo123
4. Create new document
5. Upload PDF
6. Add 2 recipients with real emails
7. Add fields and assign to different recipients using dropdown
8. Click "Send for Signing"
9. Check emails for unique signing links
10. Open each link and sign
11. Verify final PDF email sent to all

## What Works Now

✅ Multiple recipients with name + email (no browser prompts)
✅ Field assignment dropdown positioned UNDER field box
✅ Unique access token per recipient
✅ Recipients only see their assigned fields
✅ Progress tracking in dashboard
✅ Final PDF emailed to all participants
✅ Two-tab dashboard (Documents / Templates)

## What's Next (Templates)

- Add "Save as Template" button in editor
- Template creation mode with role assignment
- Template instantiation with role→email mapping
- Backend endpoint to copy template and create document
