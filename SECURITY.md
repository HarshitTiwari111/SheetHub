# 🛡️ SheetHub Security Compliance & Architecture Guide

SheetHub is engineered with **Enterprise MERN Stack Security** complying with OWASP Top 10 guidelines and strict access control requirements.

---

## 🔒 14-Point Security Verification & Implementation Matrix

| # | Security Feature | Implementation Status | Technical Details |
| :- | :--- | :--- | :--- |
| **1** | **JWT + Refresh Token Auth** | ✅ Active | Access Token (15 min expiry) + Refresh Token stored in HttpOnly cookie with SHA-256 database hashing & token rotation on refresh (`auth.routes.js`). |
| **2** | **4-Tier RBAC** | ✅ Active | `superadmin` (Rank 4), `admin` (Rank 3), `manager` (Rank 2), `employee` (Rank 1). Hierarchy permission checks (`User.js`, `auth.js`, `user.routes.js`). |
| **3** | **bcrypt Password Hashing** | ✅ Active | Salt rounds = 12 (`pre-save` hook in `User.js`). Automatic password removal from JSON responses. |
| **4** | **HTTPS + Secure HttpOnly Cookies** | ✅ Active | `httpOnly: true`, `sameSite`, configurable `secure` flag for SSL/TLS environments. HSTS header via Helmet. |
| **5** | **Helmet + CORS + Rate Limiting** | ✅ Active | Helmet security headers, CORS origin whitelist, sliding-window Rate Limiter (`express-rate-limit`) on global API & Auth endpoints. |
| **6** | **Input Validation & Sanitization** | ✅ Active | `express-validator` schema rules, `express-mongo-sanitize` (NoSQL injection guard), and `xss` filters on CSV headers & cells. |
| **7** | **Environment Variables (.env)** | ✅ Active | All JWT secrets, DB connection URIs, ports, rate limits, and super admin credentials loaded strictly via `.env`. |
| **8** | **MongoDB Atlas Security** | ✅ Active | Supports TLS 1.3, encrypted storage at rest (AES-256), MongoDB Atlas IP Access List restrictions (`0.0.0.0/0` restricted). |
| **9** | **Audit Logging** | ✅ Active | Real-time audit log model (`AuditLog.js`) capturing actor ID, email, IP, User-Agent, action type, before/after diffs, and timestamp (`/api/audit`). |
| **10** | **2FA for Admin Accounts** | ✅ Active | TOTP 2-Factor Authentication using `otplib` & QR Code generation (`qrcode`). 2-step verification during login (`/api/auth/2fa/verify-login`). |
| **11** | **Secure File Upload Validation** | ✅ Active | `multer` upload handler (`upload.routes.js`). Validates MIME types, blocks dangerous extensions (`.exe`, `.sh`, `.php`, `.js`), limits size to 5MB. |
| **12** | **Cloudflare WAF & DDoS Protection** | ✅ Active | Trust proxy enabled (`app.set('trust proxy', true)`). `cf-connecting-ip` and `x-forwarded-for` extraction for rate limiters & audit logs. |
| **13** | **Automatic Backups & Monitoring** | ✅ Active | Daily scheduled database backups (`utils/backup.js`) with 10-backup retention policy + live health check endpoint (`/api/health`). |
| **14** | **Login Alerts & Suspicious Activity** | ✅ Active | Device & IP fingerprinting (`knownDevices`). Alerts triggered on unrecognized device logins (`auth.login.new_device` audit event). |

---

## 🚀 How to Run & Test Security Features

### 1. Health & Security Monitoring Endpoint
```bash
GET http://localhost:5100/api/health
```
**Sample Output:**
```json
{
  "status": "healthy",
  "service": "SheetHub Enterprise API",
  "uptimeSeconds": 142,
  "database": { "status": "connected", "latencyMs": 2 },
  "security": {
    "rateLimiter": "active",
    "noSqlSanitizer": "active",
    "xssSanitizer": "active",
    "helmetProtection": "active",
    "auditLogging": "active",
    "twoFactorAuth": "supported"
  }
}
```

### 2. Manual Backup Trigger (Admin Only)
```bash
POST http://localhost:5100/api/health/backup
Header: Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

### 3. Enabling 2FA on Admin Account
1. Send `POST /api/auth/2fa/generate` with JWT header -> Returns secret and QR code URL.
2. Scan QR code in Google Authenticator or Authy.
3. Send `POST /api/auth/2fa/enable` with `{ secret, twoFactorCode }`.
4. Next login will require 2-step verification with 6-digit TOTP code.

---

## 🌐 Production Deployment Guidelines

- Set `NODE_ENV=production` in `.env`.
- Set `COOKIE_SECURE=true` (Requires HTTPS/SSL certificate).
- Set `CLIENT_ORIGIN` to your production domain (e.g. `https://sheethub.yourdomain.com`).
- Configure Cloudflare Proxy (Orange Cloud) for WAF DDoS defense.
- Add server outbound IP to MongoDB Atlas Network Access whitelist.
