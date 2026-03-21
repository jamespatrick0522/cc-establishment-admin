# City Connect Establishment Admin Frontend

Vue 3 + Vite + Tailwind + shadcn-vue interface for establishment/business managers.

## Stack

- Vue 3 + TypeScript
- Vue Router + Pinia
- Axios API client
- Socket.IO client for real-time inquiries
- Tailwind CSS + shadcn-vue UI components

## Theme

Light-only palette aligned with LGU admin:

- Primary: `#C62839`
- Secondary: `#2E86AB`
- Accent: `#F4B942`
- Success: `#4F8A5B`
- Background: `#F7F1E8`
- Text: `#2F2623`

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Env

- `VITE_API_BASE_URL` default: `http://localhost:3000/api/v1`
- `VITE_WS_BASE_URL` default: `http://localhost:3000`

## Integrated Backend APIs (Establishment)

- `POST /auth/register-establishment`
- `POST /auth/login`
- `GET /establishments/mine`
- `POST /establishments`
- `GET /establishments/:id`
- `PATCH /establishments/:id/status`
- `POST /establishments/:id/cover-photo`
- `GET /announcements`
- `GET /messages/conversations`
- `GET /messages/guest-conversation`
- `POST /messages/reply`

## Realtime Chat

- Namespace: `/chat`
- Handshake JWT via socket `auth.token` (`Bearer <token>`)
- Joins:
  - `joinEstablishmentInbox`
  - `joinGuestConversation`
- Listens for:
  - `message.new`
  - `message.sent`
  - `message.failed`

## Pages Included

- Login
- Register
- Dashboard
- My Establishment (create/listing management + cover upload)
- Inquiries (thread list + realtime chat reply)
- City Advisories
