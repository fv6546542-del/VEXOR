# VEXOR — Auth Testing Playbook (Emergent Managed Google Auth)

## Session model

- `db.users`: `{ id: uuid, email, username, ... , auth_provider: "password" | "google" }`
- `db.sessions`: JWT refresh sessions (rotated). NOT the Emergent auth session.
- `db.oauth_sessions`: Emergent session tokens `{ session_token, user_id, expires_at, created_at }` — 7 days TTL.

## How the flow works

1. Frontend Login button → `https://auth.emergentagent.com/?redirect={origin}/dashboard`
2. Emergent auths via Google → redirects back to `{origin}/dashboard#session_id=XXX`
3. Frontend `AuthCallback` detects `session_id` in URL hash (from `useLocation().hash`), POSTs to `/api/auth/google/session`
4. Backend calls `GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` with header `X-Session-ID`
5. Backend links (or creates) VEXOR user by email, mints VEXOR JWT access+refresh tokens, sets HttpOnly cookie with the emergent session_token.
6. Frontend clears the hash, saves the JWT tokens into localStorage (same as password flow), navigates to workspace.

## Create test session (manual)

```bash
mongosh --eval '
use("test_database");
var email = "google.qa+" + Date.now() + "@example.com";
var userId = "user_" + Date.now();
db.users.insertOne({
  id: userId,
  email: email,
  username: "gqa" + Date.now(),
  password_hash: "",
  role: "Member",
  verified: true,
  auth_provider: "google",
  tier: "free",
  created_at: new Date().toISOString()
});
var token = "test_session_" + Date.now();
db.oauth_sessions.insertOne({
  session_token: token,
  user_id: userId,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print("token=" + token);
print("userId=" + userId);
'
```

## API surface

- `POST /api/auth/google/session { session_id }` → creates/links user, mints VEXOR access+refresh, sets `session_token` HttpOnly cookie
- `GET /api/auth/me` → still returns user (JWT bearer works; cookie fallback also supported)
- `POST /api/auth/logout` → revokes JWT refresh + deletes `oauth_sessions.session_token`

## curl checks

Note: `session_id` must be ≥ 8 chars (Pydantic constraint). A too-short id returns 422, a valid-length invalid id returns 401.

```bash
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)
# too short → 422
curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/api/auth/google/session -H 'Content-Type: application/json' -d '{"session_id":"nope"}'
# valid length but invalid id → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/api/auth/google/session -H 'Content-Type: application/json' -d '{"session_id":"invalid_session_id_test"}'
```

## Playwright happy path

The backend uses **JWT bearer tokens** (localStorage `vexor_access_token`), not the emergent `session_token` cookie for API auth. To simulate an authenticated session for the frontend, seed a VEXOR user and mint JWTs directly:

```python
# obtain a working JWT pair by calling /api/auth/register or /api/auth/login
data = post("/api/auth/register", {"email": ..., "password": ..., "username": ...}).json()
await page.add_init_script(f"""
  localStorage.setItem('vexor_access_token', '{data["access_token"]}');
  localStorage.setItem('vexor_refresh_token', '{data["refresh_token"]}');
""")
await page.goto(BASE_URL)
```

The `session_token` HttpOnly cookie is set by `/api/auth/google/session` for future cookie-auth use but is currently write-only (no reader exists yet in `current_user`).

## Clean up

```bash
mongosh --eval 'use("test_database"); db.users.deleteMany({email: /^google\.qa\+/}); db.oauth_sessions.deleteMany({session_token: /^test_session_/});'
```
