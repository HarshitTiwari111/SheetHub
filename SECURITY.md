# SheetHub Security

## ✅ Implemented in code

### Authentication & Authorization
- **JWT Access Tokens** (15 min) + **Refresh Tokens** (7 d) with httpOnly cookies, rotated on refresh
- **bcryptjs** password hashing (cost 12)
- **4-tier RBAC**: `super_admin` > `admin` > `manager` > `employee` with hierarchy enforcement
- **Account lockout**: 5 failed logins → 15 min lock
- **Password change** revokes all refresh tokens
- **`active` flag** to disable users without deleting

### API Security Middleware
- **Helmet** — security headers (CSP, XSS protection, no-sniff, HSTS-ready)
- **CORS** — restricted to `CLIENT_ORIGIN` with credentials
- **Rate Limiting**
  - Global: 500 req / 15 min per IP
  - Auth endpoints: 20 attempts / 15 min per IP
- **express-mongo-sanitize** — prevents NoSQL operator injection (`$gt`, `$ne`, etc.)
- **xss** — sanitizes sheet data before returning
- **express-validator** — validates every payload (email, string lengths, IDs, URLs, roles)
- **cookie-parser** with httpOnly + sameSite=lax + secure (prod) + short scope path

### Audit Logging
- Every important action logged to `AuditLog` collection:
  - `auth.login` / `auth.logout` / `auth.change_password` (success + failures)
  - `user.create` / `user.update` / `user.delete`
  - `sheet.create` / `sheet.update` / `sheet.delete`
- Includes actor, IP, User-Agent, before/after diffs
- **Audit Logs page** in the UI for admins to review (filter by action/status)

### Environment
- All secrets in `.env` (not committed)
- Separate secrets for access + refresh JWT
- Sample `.env.example` documents every variable

---

## 🛠 Deployment / Infrastructure (not code)

These are enabled at deploy time, not in application code:

| Feature | How to enable |
|---|---|
| **HTTPS** | Behind a reverse proxy (Nginx/Caddy/Cloudflare) with TLS cert (Let's Encrypt) |
| **Secure cookies** | Set `COOKIE_SECURE=true` in `.env` once HTTPS is on |
| **MongoDB Atlas security** | Whitelist IPs, enable encryption at rest, enable backups from Atlas UI |
| **Cloudflare WAF + DDoS** | Point domain through Cloudflare, enable WAF + Bot Fight Mode |
| **Automatic backups** | Atlas continuous backup (or `mongodump` cron for self-hosted) |
| **Monitoring** | Sentry for errors, UptimeRobot / Better Uptime for uptime, Grafana for metrics |
| **Login alerts** | Requires email/SMS integration — hook into `auth.login` audit event, compare IP/UA vs history, send via SendGrid/SES |
| **2FA** | Add `speakeasy` + `qrcode`, TOTP flow for `super_admin` and `admin` — foundation is in place (audit + refresh tokens) but UI + endpoints not yet built |
| **Secure file upload** | No file uploads currently. If added later, use `multer` with strict MIME whitelist + magic byte check + virus scan (ClamAV) |

---

## Running securely in production

```bash
# 1. Generate strong secrets
openssl rand -hex 64  # → JWT_ACCESS_SECRET
openssl rand -hex 64  # → JWT_REFRESH_SECRET

# 2. Enable secure cookies
COOKIE_SECURE=true
NODE_ENV=production

# 3. Restrict origin
CLIENT_ORIGIN=https://sheethub.yourdomain.com

# 4. Use MongoDB Atlas connection with SSL
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/sheethub?retryWrites=true&w=majority

# 5. Run behind Nginx + Certbot, or Cloudflare Tunnel
```

## Suggested future additions

- 2FA (TOTP) for admin+ roles
- Login-alert emails via SES/SendGrid
- IP allowlisting for super_admin
- Session invalidation on suspicious activity (new country, UA drift)
- CSRF token for cookie-based endpoints (currently only refresh uses cookies)
