# Mtihani

A collaborative assignment platform built for structured learning workflows across three user roles.

## Roles & Permissions

| Role | Can Do |
|------|--------|
| **Director** | Create & manage workbooks and worksheets, approve or reject final grades |
| **Teacher** | Add questions to worksheets, view student submissions, suggest corrections, submit grades |
| **Student** | Answer questions in free-form text, apply teacher suggestions, view approved grades |

## Tech Stack

**Backend** — Django + Django REST Framework, Token auth, Django Channels (WebSocket-ready), PostgreSQL (SQLite in dev)

**Frontend** — React + TypeScript, React Router, TanStack Query, Tailwind CSS, React Hook Form

## Running Locally

**Backend**
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
npm start
```

The frontend proxies API requests to `http://127.0.0.1:8000` by default.

## Environment Variables (Production)

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret key |
| `DJANGO_DEBUG` | Set to `false` in production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames (no `https://`) |
| `DATABASE_URL` | PostgreSQL connection URL |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins (e.g. `https://yourapp.onrender.com`) |
| `REACT_APP_API_BASE_URL` | Backend API base URL for the frontend build |

> `CSRF_TRUSTED_ORIGINS` is automatically set from `CORS_ALLOWED_ORIGINS` in settings.