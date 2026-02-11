# Recent Changes

## New Features Implemented

### 1. User Authentication System
- **Login/Register page** at `/login` with toggle between sign in and sign up
- **JWT-like token authentication** stored in localStorage
- **User-specific documents** - each user only sees their own PDFs
- **Auth guard** on protected routes (dashboard, editor)
- **Demo account**: `demo@example.com` / `demo123`

### 2. Delete Documents
- **Delete button** on dashboard cards
- **Delete button** in editor toolbar
- **Backend DELETE endpoint** with user authorization check
- **Confirmation dialog** before deletion

### 3. Number Field Type
- Added **NUMBER** field type alongside Signature, Text, Date, Initials
- Number input with proper HTML5 type
- Fully integrated in editor and signing flow

### 4. Smart Field Spawning
- Fields now spawn on **current page** being viewed (not always page 1)
- **Scroll tracking** detects which page user is viewing
- Fields spawn at center (40%, 40%) instead of top-left corner
- `currentPageNumber` state tracks active page

### 5. Auto-Fill Signatures/Initials
- When user signs or initials once, **all matching fields auto-fill**
- Signature fields all get same signature
- Initial fields all get same initials
- **Smart progress counter** counts unique signature types, not individual fields
- Progress updates correctly: "3 of 5 fields completed"

### 6. Modern UI (deskflo.io inspired)
- **Purple/blue gradient theme** (#667eea to #764ba2)
- **Smooth animations** and hover effects
- **Rounded corners** and modern shadows
- **Gradient buttons** with transform effects
- **Clean typography** with proper font weights
- **Custom scrollbars** matching theme
- **Card-based layouts** with depth

## Technical Changes

### Backend (Flask)
- Added `/api/login` and `/api/register` endpoints
- Added `/api/documents/<id>` DELETE endpoint
- User authentication via simple token system
- User data stored in `data/users.json`
- Authorization headers required for protected endpoints
- Documents now have `userId` field

### Frontend (Angular)
- Updated `Field` type to include `'NUMBER'`
- Updated `DocumentState` to include `userId`
- Auth guard function for route protection
- Login redirects to `/login` instead of `/dashboard`
- API service includes Authorization headers
- Dashboard shows delete buttons
- Editor tracks current page for field spawning
- Sign page auto-fills matching signature/initial fields
- Progress counter logic updated for smart counting

### Styling
- All components updated with gradient backgrounds
- Button styles modernized with gradients and shadows
- Input fields with better focus states
- Cards with hover animations
- Progress bars with gradient fills
- Success screens with dramatic styling

## Files Modified

### Backend
- `backend/app.py` - Auth endpoints, delete endpoint, user management

### Frontend Core
- `src/app/models/document.model.ts` - Added NUMBER type, userId field
- `src/app/app.routes.ts` - Auth guard, login route
- `src/styles.css` - Global theme styles

### Services
- `src/app/services/auth.service.ts` - Register method, email storage
- `src/app/services/api.service.ts` - Auth headers, delete method

### Components
- `src/app/auth/login.component.ts` - Login/register toggle, modern UI
- `src/app/dashboard/dashboard.ts` - Delete method
- `src/app/dashboard/dashboard.html` - Delete button
- `src/app/dashboard/dashboard.css` - Modern gradient theme
- `src/app/home/home.ts` - Current page tracking, delete method, NUMBER field
- `src/app/home/home.html` - Number button, delete button, scroll tracking
- `src/app/home/home.css` - Modern gradient theme
- `src/app/sign/sign.ts` - Auto-fill logic, smart progress counter
- `src/app/sign/sign.html` - Number input field
- `src/app/sign/sign.css` - Modern gradient theme

### Documentation
- `README.md` - Updated features list and instructions

## How to Test

1. **Start backend**: `cd backend && python app.py`
2. **Start frontend**: `ng serve`
3. **Login**: Use `demo@example.com` / `demo123` or create new account
4. **Create document**: Upload PDF, add fields including Number field
5. **Test spawning**: Scroll to page 2, click field button - should spawn on page 2
6. **Share link**: Copy signing link
7. **Sign**: Open link, sign once - all signature fields should fill
8. **Progress**: Watch counter update correctly
9. **Delete**: Delete document from dashboard or editor
10. **Logout/Login**: Verify user-specific documents

## Design Inspiration

UI styled after **deskflo.io**:
- Purple/blue gradient color scheme
- Modern, clean interface
- Smooth animations
- Card-based layouts
- Professional typography
- Depth with shadows
