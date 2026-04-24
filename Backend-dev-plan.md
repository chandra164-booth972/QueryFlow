# Backend-dev-plan.md
## QueryFlow — Literary Agent Query Management System

---

## 1️⃣ Executive Summary

- **What:** Build a FastAPI backend that powers QueryFlow, a literary agent query management tool that ingests Gmail queries, extracts AI-powered metadata via Claude, and surfaces them in an Inbox + Kanban Pipeline UI
- **Who:** Single-agent user (literary agent, e.g. Amy Keene) who connects their Gmail, reviews submissions in an AI-analyzed inbox, and tracks manuscript status on a Kanban board
- **Why:** The frontend currently uses `mockData.ts`; this backend replaces all dummy data with live MongoDB Atlas reads/writes and real AI analysis
- **Stack constraints:**
  - FastAPI (Python 3.13, async)
  - MongoDB Atlas via Motor + Pydantic v2 models
  - No Docker — run locally via `uvicorn`
  - No Celery / no queues — use `BackgroundTasks` only where HTTP response cannot wait (Gmail ingestion)
  - Single Git branch: `main` — commit and push after every sprint's tests pass
  - API base path: `/api/v1/*`
  - No pagination (none visible in frontend UI)
- **Sprint count:** 6 sprints (S0 → S5)

---

## 2️⃣ In-Scope & Success Criteria

### In-Scope Features (frontend-visible only)

- **Onboarding:** Google OAuth Gmail connection, inbox sync progress indicator
- **AI Inbox:** List queries filtered to `new` / `reviewing` status; query detail pane with full email body
- **AI Analysis Trust Layer:** Extracted genre, wordCount, comps, summary, fitScore, fitReason, confidence per query
- **AI Override:** User can edit genre and wordCount fields inline and save back to DB
- **Action Buttons:** Pass, Request Partial, Request Full — each updates query status
- **Kanban Pipeline:** All 6 status columns (new → reviewing → requested_partial → requested_full → offered → passed); drag-and-drop status updates
- **Submissions per Query:** Editor name, imprint, date sent, reading status, follow-up date shown on Kanban cards
- **Auth:** JWT-protected backend routes + onboarded state gating

### Out of Scope (explicitly deferred in frontend)

- Editors Database view ("Coming soon in Phase 2")
- Filter functionality on Kanban (button visible but inactive placeholder)
- Sending emails (frontend uses `alert()` simulation; no real send flow)

### Success Criteria

- All frontend features work end-to-end with live backend data
- All task-level manual tests pass via the browser UI
- `/healthz` confirms MongoDB Atlas connectivity
- Gmail OAuth connects and ingests real query emails
- AI metadata is extracted and persisted per query
- Each sprint's code pushed to `main` after all task tests pass

---

## 3️⃣ API Design

- **Base path:** `/api/v1`
- **Error envelope:** `{ "error": "message string" }`
- **Auth header:** `Authorization: Bearer <jwt_token>` on all protected routes
- **No filtering or sorting parameters** (not visible in frontend UI)

---

### `/healthz`

- **GET /healthz**
- **Purpose:** Liveness + DB connectivity probe
- **Request:** none
- **Response:** `{ "status": "ok", "db": "connected" }`
- **Auth:** none

---

### Auth Endpoints

- **POST /api/v1/auth/signup**
  - **Purpose:** Register a new agent account
  - **Request:** `{ "email": string, "password": string, "name": string }`
  - **Response:** `{ "token": string, "user": { "id": string, "email": string, "name": string } }`
  - **Validation:** email unique, password ≥ 8 chars

- **POST /api/v1/auth/login**
  - **Purpose:** Authenticate and issue JWT
  - **Request:** `{ "email": string, "password": string }`
  - **Response:** `{ "token": string, "user": { "id": string, "email": string, "name": string } }`
  - **Validation:** credentials must match; return 401 on mismatch

- **POST /api/v1/auth/logout**
  - **Purpose:** Client-side token invalidation signal (stateless JWT — no server-side blocklist needed)
  - **Request:** none
  - **Response:** `{ "message": "logged out" }`
  - **Auth:** protected

- **GET /api/v1/auth/me**
  - **Purpose:** Return currently authenticated user profile
  - **Response:** `{ "id": string, "email": string, "name": string, "gmail_connected": bool }`
  - **Auth:** protected

---

### Gmail OAuth Endpoints

- **GET /api/v1/gmail/connect**
  - **Purpose:** Initiate Google OAuth flow — returns Google authorization URL
  - **Request:** none
  - **Response:** `{ "auth_url": string }`
  - **Auth:** protected

- **GET /api/v1/gmail/callback**
  - **Purpose:** OAuth callback — exchanges code for tokens, stores them, triggers background ingestion
  - **Request (query params):** `code`, `state`
  - **Response:** `{ "message": "Gmail connected, ingestion started", "queries_found": int }`
  - **Auth:** none (Google redirects here directly)
  - **Note:** Stores encrypted refresh token on user document; triggers `BackgroundTasks` ingestion job

---

### Queries Endpoints

- **GET /api/v1/queries**
  - **Purpose:** List all queries for the authenticated user
  - **Response:** `{ "queries": [ Query[] ] }`
  - **Auth:** protected

- **GET /api/v1/queries/{query_id}**
  - **Purpose:** Get full detail for a single query including full email body
  - **Response:** `Query` object (full shape — see Data Model)
  - **Auth:** protected
  - **Validation:** 404 if not found or not owned by user

- **PATCH /api/v1/queries/{query_id}**
  - **Purpose:** Update query status (Pass / Request Partial / Request Full / Kanban drag-drop) OR override AI metadata fields (genre, wordCount)
  - **Request (partial — send only fields to update):**
    ```json
    {
      "status": "passed | reviewing | requested_partial | requested_full | offered",
      "ai_metadata": { "genre": string, "word_count": string }
    }
    ```
  - **Response:** updated `Query` object
  - **Auth:** protected
  - **Validation:** status must be one of the 6 valid enum values; only `genre` and `word_count` are user-overridable in `ai_metadata`

- **POST /api/v1/queries/{query_id}/submissions**
  - **Purpose:** Add an editor submission record to a query
  - **Request:** `{ "editor_name": string, "imprint": string, "date_sent": string, "status": "Sent | Reading | Passed | Offer", "follow_up_date": string? }`
  - **Response:** updated `Query` object with new submission appended
  - **Auth:** protected

- **PATCH /api/v1/queries/{query_id}/submissions/{submission_index}**
  - **Purpose:** Update an existing editor submission (e.g. status changes to Reading → Offer)
  - **Request:** same shape as POST submissions (partial allowed)
  - **Response:** updated `Query` object
  - **Auth:** protected
  - **Validation:** 404 if submission_index out of range

---

## 4️⃣ Data Model (MongoDB Atlas)

### Collection: `users`

- `_id`: ObjectId, required
- `email`: str, required, unique
- `name`: str, required
- `hashed_password`: str, required
- `gmail_connected`: bool, default `false`
- `gmail_refresh_token`: str | None, default `None` (store encrypted)
- `created_at`: datetime, default `utcnow()`

**Example document:**
```json
{
  "_id": "664abc123",
  "email": "amy@keenelit.com",
  "name": "Amy Keene",
  "hashed_password": "$argon2id$v=19...",
  "gmail_connected": true,
  "gmail_refresh_token": "<encrypted>",
  "created_at": "2024-05-15T12:00:00Z"
}
```

---

### Collection: `queries`

- `_id`: ObjectId, required
- `user_id`: str, required (foreign ref to users._id)
- `author_name`: str, required
- `book_title`: str, required
- `email_subject`: str, required
- `email_body`: str, required
- `date_received`: datetime, required
- `status`: str, required, enum: `new | reviewing | requested_partial | requested_full | passed | offered`, default `new`
- `ai_metadata`: embedded object, required
  - `genre`: str
  - `word_count`: str
  - `comps`: list[str]
  - `summary`: str
  - `fit_score`: str, enum: `High | Medium | Low`
  - `fit_reason`: str
  - `confidence`: int (0–100)
  - `ai_processed`: bool, default `false`
- `submissions`: list[embedded Submission], default `[]`
- `created_at`: datetime, default `utcnow()`

**Embedded Submission shape:**
- `editor_name`: str, required
- `imprint`: str, required
- `date_sent`: datetime, required
- `status`: str, enum: `Sent | Reading | Passed | Offer`
- `follow_up_date`: datetime | None

**Example document:**
```json
{
  "_id": "664def456",
  "user_id": "664abc123",
  "author_name": "Eleanor Vance",
  "book_title": "The Last Bookseller of Prague",
  "email_subject": "QUERY: The Last Bookseller of Prague (Upmarket Historical Fiction)",
  "email_body": "Dear Amy Keene...",
  "date_received": "2024-05-15T10:00:00Z",
  "status": "new",
  "ai_metadata": {
    "genre": "Upmarket Historical Fiction",
    "word_count": "85,000",
    "comps": ["The Shadow of the Wind", "All the Light We Cannot See"],
    "summary": "During the 1989 Velvet Revolution, an antiquarian bookseller finds a coded manuscript...",
    "fit_score": "High",
    "fit_reason": "Matches your MSWL for 'books about books' and recent upmarket historical fiction deals.",
    "confidence": 95,
    "ai_processed": true
  },
  "submissions": [],
  "created_at": "2024-05-15T12:05:00Z"
}
```

---

## 5️⃣ Frontend Audit & Feature Map

### Onboarding Screen (`/` → `Onboarding` component)

- **Purpose:** Connect user's Gmail inbox before entering the app
- **Data needed:** Google OAuth URL; after callback — count of queries found
- **Required endpoints:**
  - `GET /api/v1/gmail/connect` → returns Google auth URL for "Continue with Google" button
  - `GET /api/v1/gmail/callback` → OAuth callback, returns `queries_found` count for progress display
- **Auth requirement:** User must be logged in before onboarding; `onComplete()` sets `isOnboarded=true` in state
- **Note:** Step 2 shows "142 queries found" and a pulsing progress bar — `queries_found` count drives the count display; `isOnboarded` flag can be persisted in user document

---

### AI Inbox (`currentView === 'inbox'` → `Inbox` component)

- **Purpose:** Show unread/reviewing queries; display AI analysis panel; allow status actions
- **Data needed:** All queries with status `new` or `reviewing`; full email body + aiMetadata for selected query
- **Required endpoints:**
  - `GET /api/v1/queries` → drives query list (filtered client-side to `new | reviewing`)
  - `PATCH /api/v1/queries/{id}` → Pass button sets `status: "passed"`; Request Partial sets `status: "requested_partial"`; Request Full sets `status: "requested_full"`
  - `PATCH /api/v1/queries/{id}` → Save Overrides button sends updated `ai_metadata.genre` and `ai_metadata.word_count`
- **Auth requirement:** protected
- **Note:** "Override AI" toggle is UI-only; Save Overrides calls PATCH with the edited values; comps, summary, fitScore, fitReason remain read-only

---

### Pipeline (`currentView === 'pipeline'` → `Kanban` component)

- **Purpose:** Full-status Kanban board; drag-and-drop moves queries between columns
- **Data needed:** All queries (all statuses) with aiMetadata + submissions
- **Required endpoints:**
  - `GET /api/v1/queries` → all queries, no filter
  - `PATCH /api/v1/queries/{id}` → drag-drop calls PATCH with new `status`
- **Auth requirement:** protected
- **Note:** The "Filter" button is a placeholder — no filter endpoint needed; team avatars (AK, JB, MR) are decorative UI

---

### Submissions (Kanban card detail)

- **Purpose:** Show editor submission count and follow-up date on Kanban cards; allow adding/editing submissions
- **Data needed:** `submissions[]` array embedded in query document
- **Required endpoints:**
  - `POST /api/v1/queries/{id}/submissions` → add new editor submission
  - `PATCH /api/v1/queries/{id}/submissions/{index}` → update existing submission status
- **Auth requirement:** protected

---

### Editors View (`currentView === 'editors'`)

- **Purpose:** "Coming soon in Phase 2" placeholder
- **Required endpoints:** none
- **Auth requirement:** n/a

---

## 6️⃣ Configuration & ENV Vars

- `APP_ENV` — environment string; default `development`
- `PORT` — HTTP port; default `8000`
- `MONGODB_URI` — MongoDB Atlas connection string (already exists in `backend/.env`)
- `JWT_SECRET` — random secret for signing JWTs; no default — must be set
- `JWT_EXPIRES_IN` — JWT expiry in seconds; default `86400` (24 hours)
- `CORS_ORIGINS` — comma-separated list of allowed frontend URLs; default `http://localhost:3000`
- `GOOGLE_CLIENT_ID` — Google OAuth 2.0 client ID for Gmail integration
- `GOOGLE_CLIENT_SECRET` — Google OAuth 2.0 client secret for Gmail integration
- `GOOGLE_REDIRECT_URI` — OAuth callback URL; default `http://localhost:8000/api/v1/gmail/callback`
- `ANTHROPIC_API_KEY` — Claude API key for AI metadata extraction
- `GMAIL_TOKEN_ENCRYPTION_KEY` — Fernet key to encrypt/decrypt stored Gmail refresh tokens

---

## 7️⃣ Background Work

### Gmail Ingestion + AI Analysis Job

- **Trigger:** Fired via `BackgroundTasks` from `GET /api/v1/gmail/callback` after OAuth token exchange succeeds
- **Purpose:** Fetch last 30 days of query emails from Gmail, run Claude AI analysis on each, persist to `queries` collection
- **Why BackgroundTasks:** HTTP response must return immediately (142 emails × AI call each cannot block a single request); `BackgroundTasks` is the minimal required approach per constraints
- **Flow:**
  1. Fetch emails from Gmail API using stored refresh token (filter by label/query format)
  2. For each email: create a `query` document with `ai_metadata.ai_processed = false`
  3. Call Anthropic Claude API to extract genre, word_count, comps, summary, fit_score, fit_reason, confidence
  4. Update document with extracted metadata; set `ai_processed = true`
- **Idempotency:** Check `email_subject + date_received + user_id` uniqueness before inserting — skip duplicates on re-trigger
- **UI completion check:** `GET /api/v1/queries` count of returned documents; frontend can poll (or simply navigate) after callback redirects to dashboard

---

## 8️⃣ Integrations

### Gmail API (Google OAuth 2.0)

- **Purpose:** Read query emails from the literary agent's Gmail inbox
- **Flow:**
  1. Frontend calls `GET /api/v1/gmail/connect` → backend returns Google OAuth authorization URL
  2. User clicks "Continue with Google" → browser redirects to Google consent screen
  3. Google redirects to `GET /api/v1/gmail/callback?code=...` → backend exchanges code for access + refresh tokens
  4. Refresh token encrypted with Fernet and stored on user document
  5. BackgroundTasks job fetches messages using `google-api-python-client`
- **Extra env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Scope requested:** `https://www.googleapis.com/auth/gmail.readonly` (read-only, matches frontend copy)

### Anthropic Claude API

- **Purpose:** Extract AI metadata from raw query email text
- **Flow:**
  1. Send email body to Claude with a structured extraction prompt
  2. Parse JSON response for genre, word_count, comps[], summary, fit_score (High/Medium/Low), fit_reason, confidence (0–100)
  3. Persist to `queries.ai_metadata`
- **Extra env vars:** `ANTHROPIC_API_KEY`
- **Model:** `claude-haiku-4-5-20251001` (fast, cheap, good for extraction tasks)

---

## 9️⃣ Testing Strategy (Manual via Frontend)

- **All validation through the browser UI** — no automated test framework
- **Every task** includes a Manual Test Step (exact UI action + expected visible result) and a User Test Prompt (copy-paste instruction)
- **Sprint gate:** All tasks in a sprint must pass their manual tests before pushing to `main`
- **On failure:** Fix the issue, retest the specific task, then continue — do not push until clean
- **Post-sprint:** `git add`, `git commit -m "Sprint SX: <description>"`, `git push origin main`

---

## 🔟 Dynamic Sprint Plan & Backlog (S0 → S5)

---

## 🧱 S0 — Environment Setup & Frontend Connection

### Objectives

- Create FastAPI project skeleton in `QueryFlow-d10bc33c/backend/`
- Wire up `/healthz` with MongoDB Atlas ping
- Enable CORS for `http://localhost:3000`
- Wire frontend to use a real API base URL via env var
- Initialize Git with single `main` branch and push to GitHub

### User Stories

- As a developer, I can run the backend and confirm it connects to MongoDB Atlas
- As a developer, I can see the frontend make a real HTTP request to `/healthz`

### Tasks

**Task S0.1 — Create backend project structure**
- Create `QueryFlow-d10bc33c/backend/` with:
  - `main.py` — FastAPI app entry point with `/healthz` and CORS middleware
  - `requirements.txt` — `fastapi`, `uvicorn[standard]`, `motor`, `pydantic[email]`, `python-dotenv`, `argon2-cffi`, `pyjwt`, `google-api-python-client`, `google-auth-oauthlib`, `anthropic`, `cryptography`
  - `config.py` — loads all ENV vars using `python-dotenv`
  - `db.py` — Motor async client singleton, `ping_db()` helper
  - `.gitignore` at project root: `__pycache__/`, `.env`, `*.pyc`, `.venv/`, `*.egg-info/`
- **Manual Test Step:** Run `pip install -r requirements.txt && uvicorn main:app --reload --port 8000` in `backend/`; open browser at `http://localhost:8000/healthz` → should return `{"status": "ok", "db": "connected"}`
- **User Test Prompt:** "Start the backend with `uvicorn main:app --reload`. Open `http://localhost:8000/healthz` in your browser. Confirm you see `status: ok` and `db: connected` in the response."

**Task S0.2 — Wire frontend to real API URL**
- Create `QueryFlow-d10bc33c/frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- Add `lib/api.ts` with a typed `apiFetch` wrapper that prepends `NEXT_PUBLIC_API_URL` and handles the error envelope
- Update `Onboarding.tsx`: replace the simulated `setTimeout` with a real call to `GET /api/v1/gmail/connect` when "Continue with Google" is clicked
- **Manual Test Step:** Start frontend (`npm run dev`), open browser DevTools → Network tab, refresh the app → confirm requests are directed to `localhost:8000` not mock data
- **User Test Prompt:** "Start the frontend (`npm run dev`) and open DevTools → Network. Refresh the page. Confirm API calls go to `http://localhost:8000/api/v1` (even if they fail with 401 for now — that confirms routing is live)."

**Task S0.3 — Git initialization and GitHub push**
- Confirm single `.gitignore` at `QueryFlow-d10bc33c/` root covers `__pycache__/`, `.env`, `*.pyc`, `.venv/`, `node_modules/`, `.next/`
- Ensure default branch is `main`
- Stage all backend files and push initial commit to GitHub
- **Manual Test Step:** Visit GitHub repo → confirm `backend/` directory is visible on `main` branch
- **User Test Prompt:** "Open your GitHub repo in a browser. Confirm the `backend/` folder and `main.py` are visible on the `main` branch."

### Definition of Done

- Backend runs locally, `/healthz` returns `{"status":"ok","db":"connected"}`
- Frontend points to `localhost:8000` API base
- Repo live on GitHub `main` with no `.env` committed

### Post-Sprint

- `git add backend/ frontend/.env.local frontend/lib/api.ts && git commit -m "S0: FastAPI skeleton, Atlas connection, CORS, frontend wired" && git push origin main`

---

## 🧩 S1 — JWT Authentication

### Objectives

- Implement signup, login, logout, and `/me` endpoints
- Hash passwords with Argon2
- Issue JWT tokens; protect all subsequent routes with a `get_current_user` dependency

### User Stories

- As an agent, I can create an account with email + password
- As an agent, I can log in and receive a JWT stored in the browser
- As an agent, after logout I cannot access protected pages

### Tasks

**Task S1.1 — User model + DB layer**
- Create `models/user.py` with Pydantic v2 `UserDocument` matching the `users` collection schema
- Create `routers/auth.py` skeleton
- Create `services/auth_service.py` with `create_user`, `get_user_by_email`, `verify_password`, `create_jwt`, `decode_jwt`
- **Manual Test Step:** n/a (code only — covered by next task's test)
- **User Test Prompt:** n/a

**Task S1.2 — Signup endpoint**
- `POST /api/v1/auth/signup` → hash password via Argon2, insert user into `users` collection, return JWT + user object
- **Manual Test Step:** Open browser console or Postman; send `POST http://localhost:8000/api/v1/auth/signup` with `{"email":"amy@test.com","password":"testpass1","name":"Amy Keene"}` → confirm 200 with `token` in response
- **User Test Prompt:** "Open the browser DevTools console. Run: `fetch('http://localhost:8000/api/v1/auth/signup', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'amy@test.com', password:'testpass1', name:'Amy Keene'})}).then(r=>r.json()).then(console.log)`. Confirm a `token` string appears in the output."

**Task S1.3 — Login endpoint**
- `POST /api/v1/auth/login` → verify Argon2 hash, return JWT + user object; 401 on mismatch
- **Manual Test Step:** Call login via console with same credentials from S1.2 → confirm token returned; then call with wrong password → confirm 401 response
- **User Test Prompt:** "In DevTools console, run the login fetch with correct credentials (email: amy@test.com, password: testpass1). Confirm token in response. Then run again with wrong password — confirm `error` field in response and no token."

**Task S1.4 — `get_current_user` dependency + logout**
- Create `dependencies.py` with `get_current_user` FastAPI dependency that reads `Authorization: Bearer` header and returns current user or raises 401
- `POST /api/v1/auth/logout` → returns `{"message":"logged out"}` (client clears token)
- `GET /api/v1/auth/me` → returns user object using `get_current_user`
- Store JWT in `localStorage` in frontend (set on login response)
- **Manual Test Step:** Log in via console, copy the token, then call `GET /api/v1/auth/me` with `Authorization: Bearer <token>` header → confirm user object returned; then call without header → confirm 401
- **User Test Prompt:** "In DevTools console: (1) log in and copy the token. (2) Run `fetch('http://localhost:8000/api/v1/auth/me', {headers:{'Authorization':'Bearer YOUR_TOKEN'}}).then(r=>r.json()).then(console.log)` — confirm your name and email appear. (3) Run the same without the header — confirm an error response."

**Task S1.5 — Wire auth to frontend Onboarding entry point**
- Add a simple login form to the frontend (or auto-login with test credentials during development) so token is stored before onboarding renders
- Onboarding's "Continue with Google" only shows when a valid JWT is present
- **Manual Test Step:** Open app → confirm Onboarding renders; log in via the login form → confirm "Continue with Google" button is visible and Onboarding step 1 appears
- **User Test Prompt:** "Open the app in the browser. If a login form appears, enter email `amy@test.com` and password `testpass1`. Confirm you see the Onboarding screen with 'Continue with Google'."

### Definition of Done

- Signup and login return a JWT
- `/me` returns user data only with valid token
- 401 returned on missing/invalid token for protected routes

### Post-Sprint

- `git add -p && git commit -m "S1: JWT auth — signup, login, logout, me, get_current_user dependency" && git push origin main`

---

## 📬 S2 — Queries API (Core CRUD + Status Updates)

### Objectives

- Seed a few test queries in MongoDB so the frontend renders real data
- Build list, get, and status-update endpoints
- Wire Inbox and Kanban to live API data instead of `mockData.ts`

### User Stories

- As an agent, I can see my queries in the AI Inbox with real data from MongoDB
- As an agent, I can click Pass / Request Partial / Request Full and see the query move out of Inbox
- As an agent, I can drag a Kanban card to a different column and the change persists on refresh

### Tasks

**Task S2.1 — Query model + seed script**
- Create `models/query.py` with `QueryDocument` Pydantic v2 model matching `queries` collection schema
- Create `scripts/seed.py` — inserts the 4 mock queries from `mockData.ts` into MongoDB for the test user (requires `user_id` of created user)
- Run seed script once: `python scripts/seed.py`
- **Manual Test Step:** Open MongoDB Atlas Data Explorer → `queries` collection → confirm 4 documents visible with correct fields
- **User Test Prompt:** "Log in to MongoDB Atlas, go to your cluster → Collections → `queryflow` database → `queries` collection. Confirm 4 documents are present with fields like `author_name`, `book_title`, and `ai_metadata`."

**Task S2.2 — GET /api/v1/queries**
- Return all queries owned by authenticated user, sorted by `date_received` descending
- **Manual Test Step:** Call `GET /api/v1/queries` with valid JWT in Authorization header → confirm all 4 seeded queries returned as JSON array
- **User Test Prompt:** "In DevTools console: `fetch('http://localhost:8000/api/v1/queries', {headers:{'Authorization':'Bearer YOUR_TOKEN'}}).then(r=>r.json()).then(console.log)`. Confirm 4 queries appear with author names matching the seed data."

**Task S2.3 — GET /api/v1/queries/{id}**
- Return single query by `_id`; 404 if not found or not owned by user
- **Manual Test Step:** Copy one `_id` from the list response, call `GET /api/v1/queries/<id>` → confirm full email body is included; call with a fake ID → confirm 404
- **User Test Prompt:** "In DevTools console: take one `_id` from the previous response. Run `fetch('http://localhost:8000/api/v1/queries/REPLACE_ID', {headers:{'Authorization':'Bearer YOUR_TOKEN'}}).then(r=>r.json()).then(console.log)`. Confirm the full `email_body` field is present."

**Task S2.4 — PATCH /api/v1/queries/{id} (status + ai_metadata override)**
- Accept partial update: `status` and/or `ai_metadata` fields (`genre`, `word_count` only)
- Return updated query document
- **Manual Test Step:** Call PATCH with `{"status": "reviewing"}` on a `new` query → confirm response shows `status: "reviewing"`; call PATCH with `{"ai_metadata": {"genre": "Thriller"}}` → confirm genre updated; call with invalid status → confirm 422 validation error
- **User Test Prompt:** "In DevTools console, run: `fetch('http://localhost:8000/api/v1/queries/REPLACE_ID', {method:'PATCH', headers:{'Authorization':'Bearer YOUR_TOKEN','Content-Type':'application/json'}, body: JSON.stringify({status:'reviewing'})}).then(r=>r.json()).then(console.log)`. Confirm the returned query shows `status: 'reviewing'`."

**Task S2.5 — Wire Inbox component to live API**
- Replace `mockQueries` import in `QueryFlowApp.tsx` with `useEffect` that calls `GET /api/v1/queries` on mount
- Store JWT in context (or `localStorage`) and pass as Authorization header in `apiFetch`
- Inbox action buttons (Pass, Request Partial, Request Full) call `PATCH /api/v1/queries/{id}` with the correct status
- **Manual Test Step:** Start both frontend and backend; open AI Inbox → confirm 4 real queries load (not dummy data); click "Pass" on the first query → confirm it disappears from Inbox list; refresh the page → confirm the passed query stays gone from Inbox (status persisted)
- **User Test Prompt:** "Open the app. In the AI Inbox, confirm you see the 4 queries with real author names. Click 'Pass' on 'Eleanor Vance — The Last Bookseller of Prague'. Confirm it disappears from the Inbox. Refresh the page — confirm it does not reappear in the Inbox."

**Task S2.6 — Wire Kanban component to live API**
- Kanban reads same `GET /api/v1/queries` endpoint; drag-and-drop calls `PATCH /api/v1/queries/{id}` with new status
- **Manual Test Step:** Open Pipeline view → confirm all 4 queries appear in correct columns; drag "Silicon Ghosts" from Reviewing to Partial MS → confirm it moves visually; refresh page → confirm Silicon Ghosts is still in Partial MS column
- **User Test Prompt:** "Open the Pipeline view. Confirm 4 queries are distributed across columns correctly. Drag 'Silicon Ghosts' from the 'Reviewing' column to 'Partial MS'. Confirm the card moves. Refresh the page — confirm 'Silicon Ghosts' is still in 'Partial MS'."

### Definition of Done

- Inbox and Kanban render live data from MongoDB
- Status updates persist across page refreshes
- AI metadata override saves to DB

### Post-Sprint

- `git add -p && git commit -m "S2: Queries CRUD, status updates, Inbox+Kanban wired to live API" && git push origin main`

---

## 📧 S3 — Gmail OAuth & Email Ingestion

### Objectives

- Implement Google OAuth 2.0 flow for Gmail read access
- After OAuth, fetch last 30 days of emails and insert as query documents
- Update Onboarding screen to use real OAuth flow

### User Stories

- As an agent, I can click "Continue with Google" and be redirected to Google's consent screen
- As an agent, after approving access I am redirected back to the app with my inbox synced
- As an agent, the Onboarding step 2 shows the correct count of queries found

### Tasks

**Task S3.1 — Google OAuth setup**
- Configure Google Cloud OAuth 2.0 credentials (Client ID + Secret) in `backend/.env`
- Create `routers/gmail.py` with `GET /api/v1/gmail/connect` that returns the Google authorization URL
- Authorized redirect URI configured in Google Cloud Console as `http://localhost:8000/api/v1/gmail/callback`
- **Manual Test Step:** Call `GET /api/v1/gmail/connect` with JWT → confirm response contains `auth_url` pointing to `accounts.google.com/o/oauth2/auth`
- **User Test Prompt:** "In DevTools console, run `fetch('http://localhost:8000/api/v1/gmail/connect', {headers:{'Authorization':'Bearer YOUR_TOKEN'}}).then(r=>r.json()).then(console.log)`. Confirm an `auth_url` is returned that starts with `https://accounts.google.com`."

**Task S3.2 — OAuth callback handler**
- `GET /api/v1/gmail/callback?code=...&state=...` exchanges code for refresh token
- Encrypt refresh token with Fernet; store on user document; set `gmail_connected: true`
- Return `{"message": "Gmail connected", "queries_found": N}` and trigger BackgroundTasks ingestion job
- **Manual Test Step:** Click "Continue with Google" in Onboarding → Google consent screen opens → approve → confirm browser redirects back to app; check MongoDB Atlas → confirm user document has `gmail_connected: true`
- **User Test Prompt:** "Click 'Continue with Google' in the Onboarding screen. Approve Gmail read access on the Google consent page. Confirm the browser returns to the app and shows Onboarding step 2 with a query count. Then open MongoDB Atlas → users collection → confirm your user now shows `gmail_connected: true`."

**Task S3.3 — Gmail email fetcher**
- Create `services/gmail_service.py` with `fetch_query_emails(user_id, refresh_token)` that:
  - Fetches emails from last 30 days using Gmail API (`messages.list` + `messages.get`)
  - Filters to emails that appear to be book queries (subject contains "query" OR "QUERY" — case-insensitive)
  - Returns list of raw email dicts with `subject`, `body`, `sender`, `date`
- **Manual Test Step:** Add a temporary debug endpoint `GET /api/v1/gmail/debug-fetch` that calls the fetcher and returns raw email count → confirm count is non-zero after OAuth
- **User Test Prompt:** "After completing OAuth, call `GET /api/v1/gmail/debug-fetch` with your JWT. Confirm the response shows a non-zero count of emails fetched from Gmail."

**Task S3.4 — Ingestion + deduplication**
- Create `services/ingestion_service.py` — loops fetched emails, checks for duplicates by `(email_subject + date_received + user_id)`, inserts new query documents with `ai_processed: false`
- BackgroundTasks job in callback calls ingestion service after token storage
- **Manual Test Step:** Trigger ingestion (complete OAuth or call debug endpoint); check MongoDB `queries` collection → confirm new documents with `ai_processed: false` and real email bodies present; trigger again → confirm no duplicate documents created
- **User Test Prompt:** "Open MongoDB Atlas → queries collection. Confirm new query documents appeared after completing the Gmail OAuth flow. Each should have `ai_processed: false`. Complete the OAuth flow a second time — confirm the query count does NOT double (no duplicates)."

**Task S3.5 — Wire Onboarding step 2 to live data**
- Onboarding step 2 "Processing last 30 days... 142 queries found" — replace hardcoded `142` with actual `queries_found` count from callback response
- After callback completes, redirect to dashboard; `isOnboarded` stored in `localStorage` so onboarding doesn't re-show on refresh
- **Manual Test Step:** Complete full Gmail OAuth flow → Onboarding step 2 appears with real query count; click "Go to Dashboard" → Inbox loads; refresh page → Onboarding does not appear again
- **User Test Prompt:** "Complete the Gmail OAuth flow. On Onboarding step 2, confirm the query count matches the number of query emails in your Gmail inbox (last 30 days). Click 'Go to Dashboard' and confirm Inbox loads. Refresh the browser — confirm you go straight to the Inbox without seeing Onboarding again."

### Definition of Done

- Full Google OAuth flow works end-to-end in the browser
- Query emails ingested and persisted in MongoDB (no duplicates)
- Onboarding step 2 shows real query count
- `gmail_connected: true` on user document

### Post-Sprint

- `git add -p && git commit -m "S3: Gmail OAuth, email ingestion, deduplication, Onboarding wired" && git push origin main`

---

## 🤖 S4 — AI Metadata Extraction (Claude)

### Objectives

- For every ingested query with `ai_processed: false`, call Anthropic Claude to extract metadata
- Populate `ai_metadata` fields: genre, word_count, comps, summary, fit_score, fit_reason, confidence
- Update query documents to `ai_processed: true`
- Frontend AI Analysis panel shows live AI-extracted data

### User Stories

- As an agent, every new query in my Inbox shows AI-extracted genre, fit score, summary, and comps
- As an agent, the confidence bar reflects Claude's actual extraction confidence
- As an agent, the fit reason explains why the book is a good or poor match

### Tasks

**Task S4.1 — Claude extraction service**
- Create `services/ai_service.py` with `extract_query_metadata(email_body: str, agent_preferences: str) -> dict`
- Prompt Claude (`claude-haiku-4-5-20251001`) to return a JSON object with fields: `genre`, `word_count`, `comps` (list), `summary`, `fit_score` (High/Medium/Low), `fit_reason`, `confidence` (int 0–100)
- Use a system prompt that establishes the agent's MSWL context (hardcoded sensible default: literary fiction, upmarket fiction, narrative nonfiction; no epic fantasy)
- Parse the JSON from Claude's response; fall back to default values if extraction fails
- **Manual Test Step:** Add temporary endpoint `POST /api/v1/queries/test-ai` that accepts `{"email_body": "..."}` and returns extracted metadata → call it with a sample query email body → confirm all metadata fields are populated
- **User Test Prompt:** "In DevTools console, run: `fetch('http://localhost:8000/api/v1/queries/test-ai', {method:'POST', headers:{'Authorization':'Bearer YOUR_TOKEN','Content-Type':'application/json'}, body: JSON.stringify({email_body: 'Dear Amy, I am querying my 80,000-word literary debut...'})}).then(r=>r.json()).then(console.log)`. Confirm the response includes `genre`, `fit_score`, `summary`, and a `confidence` number."

**Task S4.2 — Bulk process unprocessed queries**
- Create `services/process_queries.py` with `process_unprocessed_queries(user_id: str)` — fetches all queries where `ai_processed: false`, calls `extract_query_metadata` for each, updates documents
- Integrate this function into the BackgroundTasks ingestion job (runs after email ingestion)
- **Manual Test Step:** After ingestion, wait ~30 seconds for background processing; open MongoDB Atlas → queries collection → confirm `ai_processed: true` and `ai_metadata` fields populated on ingested documents
- **User Test Prompt:** "After completing Gmail OAuth and waiting 30 seconds, open MongoDB Atlas → queries collection. Confirm that documents that had `ai_processed: false` now show `ai_processed: true` and have real values in `genre`, `fit_score`, and `summary`."

**Task S4.3 — Frontend AI Analysis panel shows live data**
- Verify Inbox AI Analysis panel renders live `ai_metadata` from the API (no remaining mock data)
- Genre, word count, fit score, fit reason, confidence bar, comps all sourced from real query document
- **Manual Test Step:** Open AI Inbox; select any query that came from real Gmail ingestion → confirm the "AI Analysis" panel shows real AI-extracted data (not mock copy); check the confidence bar visually reflects the confidence value from MongoDB
- **User Test Prompt:** "Open the AI Inbox and select a query that was imported from your Gmail. In the 'AI Analysis' panel, confirm the genre, summary, and fit reason text are specific to that book's email content (not generic dummy data). Confirm the confidence bar is partially filled."

**Task S4.4 — Remove `/api/v1/queries/test-ai` debug endpoint**
- Delete the temporary test endpoint added in S4.1
- **Manual Test Step:** Confirm `POST /api/v1/queries/test-ai` returns 404
- **User Test Prompt:** "Run `fetch('http://localhost:8000/api/v1/queries/test-ai', {method:'POST', headers:{'Authorization':'Bearer YOUR_TOKEN'}}).then(r=>r.status).then(console.log)`. Confirm status 404 or 405."

### Definition of Done

- All ingested queries have `ai_processed: true` and real metadata
- Inbox AI Analysis panel displays live AI data
- No mock data remains in the frontend for AI fields

### Post-Sprint

- `git add -p && git commit -m "S4: Claude AI metadata extraction, process_unprocessed_queries, live AI panel" && git push origin main`

---

## 📋 S5 — Submissions / Editor Tracking

### Objectives

- Implement add and update endpoints for submissions embedded in query documents
- Kanban cards display real submission count and follow-up dates from MongoDB

### User Stories

- As an agent, I can add an editor submission to a query (editor name, imprint, date, status)
- As an agent, when I submit a manuscript, the Kanban card shows the editor count and follow-up date
- As an agent, I can update an editor submission's status (e.g. from Sent → Reading)

### Tasks

**Task S5.1 — POST /api/v1/queries/{id}/submissions**
- Append a new submission object to the `submissions` array in the query document
- Return the updated full query document
- **Manual Test Step:** Call `POST /api/v1/queries/<id>/submissions` with `{"editor_name":"Julia Brown","imprint":"Knopf","date_sent":"2024-05-10T00:00:00Z","status":"Reading","follow_up_date":"2024-05-30T00:00:00Z"}` → confirm response includes the submission in `submissions` array; check MongoDB Atlas → confirm document updated
- **User Test Prompt:** "In DevTools console, run the POST submissions fetch with a real query ID from your database. Confirm the response includes a `submissions` array with your new entry. Open MongoDB Atlas → queries collection → confirm the submission appears in the document."

**Task S5.2 — PATCH /api/v1/queries/{id}/submissions/{index}**
- Update a submission at the given array index with provided fields
- Return the updated full query document
- 404 if index out of range
- **Manual Test Step:** Using the same query ID, call PATCH on index 0 with `{"status": "Offer"}` → confirm submission status updated to Offer in response; call with index 99 → confirm 404
- **User Test Prompt:** "Run a PATCH call to update the submission you just added: `fetch('http://localhost:8000/api/v1/queries/QUERY_ID/submissions/0', {method:'PATCH', headers:{...}, body: JSON.stringify({status:'Offer'})}).then(r=>r.json()).then(console.log)`. Confirm `submissions[0].status` is now `'Offer'`."

**Task S5.3 — Wire Kanban submission display to live data**
- Kanban cards already read `query.submissions` — confirm this renders correctly with real data from MongoDB
- Editor count badge and follow-up date display on cards should reflect real submission data
- **Manual Test Step:** Open Pipeline view → find the query you added a submission to in S5.1 → confirm Kanban card shows "1 Editor(s)" and the correct follow-up date
- **User Test Prompt:** "Open the Pipeline view. Find the query you added the 'Julia Brown / Knopf' submission to. Confirm its Kanban card shows '1 Editor(s)' and the follow-up date 'May 30'."

**Task S5.4 — Remove debug/seed endpoints and clean up**
- Remove `GET /api/v1/gmail/debug-fetch` (added in S3.3) if still present
- Remove seed script from routes if it was temporarily exposed
- Run `python scripts/seed.py` deletion or ensure seed data doesn't conflict with real Gmail data
- Confirm `/healthz` still returns healthy
- **Manual Test Step:** Hit `/healthz` → confirm 200 OK and `db: connected`; confirm no debug endpoints return 200
- **User Test Prompt:** "Open `http://localhost:8000/healthz`. Confirm you see `status: ok` and `db: connected`. The app should be fully functional with live data."

### Definition of Done

- Submissions add and update correctly via API
- Kanban displays real editor count + follow-up date from MongoDB
- No debug endpoints remaining
- Full app works end-to-end with real Gmail data, real AI metadata, and persistent status changes

### Post-Sprint

- `git add -p && git commit -m "S5: Submissions/editor tracking, Kanban live data, cleanup" && git push origin main`

---

## ✅ Style & Compliance Checklist

- Bullets only — no tables or prose paragraphs
- Only frontend-visible features included
- MongoDB Atlas only (connection string already in `backend/.env`)
- Python 3.13 + FastAPI async runtime
- No Docker, no Celery, no queues
- `BackgroundTasks` used only for Gmail ingestion (strictly necessary — cannot block HTTP response)
- Single branch `main` throughout
- API base `/api/v1/*` on all endpoints
- No pagination (not visible in frontend UI)
- Every task has Manual Test Step + User Test Prompt
- Commit and push to `main` after each sprint's tests pass
