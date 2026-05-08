# Portfolio Sync App

A React + TypeScript starter for a unified personal finance dashboard backed by Firebase.

## Implemented in this version
- Dashboard shell for assets, liabilities, and sync status
- Firebase app bootstrap (`src/lib/firebase.ts`)
- Firestore-first dashboard hook (`src/hooks/useDashboardData.ts`)
- Firebase callable wrappers for broker and Gmail sync (`src/services/functions.ts`)
- Firestore security rules under `firebase/`
- Cloud Functions scaffolding for Zerodha login/sync and Gmail OAuth/sync

## Environment variables

### Frontend (`.env`)
Use the same keys as `.env.example`.

### Functions
Set these in your deployment environment:
- `ZERODHA_API_KEY`
- `ZERODHA_API_SECRET`
- `ZERODHA_REDIRECT_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URL`

## What still needs implementation
- OAuth callback endpoints that exchange Zerodha `request_token` and Gmail `code` for tokens
- Token encryption / secret storage
- INDmoney and Smallcase connectors
- Statement PDF parsing pipeline per bank/card issuer
- Real Firestore subscriptions instead of initial one-shot reads
