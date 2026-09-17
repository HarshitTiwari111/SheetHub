# 📊 SheetHub

All your Google Sheets, one place. MERN stack app with role-based auth (Admin + User).

## Features

- 🔐 JWT login (Admin + User roles)
- 📊 Dashboard with all connected sheets
- 📄 Dynamic sheet pages — add new sheets from UI (no code changes)
- ➕ Admin can add/edit/delete sheets any time
- 👥 Admin manages users (create/edit/delete/change roles)
- 🔍 Search + refresh on sheet data
- 🎨 Clean UI with Tailwind CSS

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs
- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Axios, Lucide icons
- **Sheets:** Public Google Sheets fetched as CSV (no Google API key required)

## Project Structure

```
SheetHub/
├── server/          # Express + MongoDB backend
│   └── src/
│       ├── models/       # User, Sheet
│       ├── routes/       # auth, users, sheets
│       ├── middleware/   # auth (JWT + adminOnly)
│       ├── utils/        # token, seedAdmin
│       └── server.js
└── client/          # React + Vite frontend
    └── src/
        ├── pages/        # Login, Dashboard, SheetView, Users, Profile
        ├── components/   # Layout, Sidebar, AddSheetModal
        ├── context/      # AuthContext
        └── api/          # axios client
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (or Atlas URL)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# .env me MONGO_URI aur JWT_SECRET edit karlo
npm run seed        # creates first admin from ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev         # starts on http://localhost:5000
```

Default admin (from `.env.example`):
- **Email:** `admin@sheethub.com`
- **Password:** `admin123`

### 2. Frontend

```bash
cd client
npm install
npm run dev         # starts on http://localhost:5173
```

Browser me `http://localhost:5173` open karo, admin se login karo.

## How to add a Google Sheet

1. Google Sheet open karo → **Share** → **Anyone with the link — Viewer**
2. URL copy karo (e.g. `https://docs.google.com/spreadsheets/d/ABC.../edit#gid=0`)
3. SheetHub sidebar me **➕ Add Page** click karo (admin only)
4. Sheet name + URL paste karo → **Save**
5. Sidebar me naya page turant aa jayega ✅

## API Endpoints

**Auth**
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET  /api/auth/me` — current user
- `PUT  /api/auth/change-password` — `{ oldPassword, newPassword }`

**Users** (admin only)
- `GET    /api/users`
- `POST   /api/users` — `{ name, email, password, role }`
- `PUT    /api/users/:id`
- `DELETE /api/users/:id`

**Sheets** (login required; write = admin only)
- `GET    /api/sheets` — all sheets
- `GET    /api/sheets/:id` — sheet meta
- `GET    /api/sheets/:id/data` — parsed CSV `{ headers, rows, count }`
- `POST   /api/sheets` — `{ name, url }`
- `PUT    /api/sheets/:id`
- `DELETE /api/sheets/:id`

## Roles

- **Admin** — sab kuch kar sakta hai (users manage, sheets add/edit/delete)
- **User** — sirf sheets ka data dekh sakta hai, apna password change kar sakta hai

## Notes

- Sheets ka data live fetch hota hai — cache nahi hai (fresh data har baar).
- Bade sheets ke liye pagination ya server-side caching add kar sakte ho baad me.
- Google Sheet ko public rakhna zaroori hai (Anyone with link — Viewer).
- Private sheets ke liye Google Sheets API + Service Account setup karna padega (future upgrade).
