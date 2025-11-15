# StorX Application

Next.js application for StorX OAuth integration and file management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
STORX_CLIENT_ID=your_client_id
STORX_CLIENT_SECRET=your_client_secret
STORX_REDIRECT_URI=http://localhost/callback
STORX_OAUTH_URL=http://localhost:10002/oauth2-integration
STORX_AUTH_API_URL=https://auth.storx.io/v1
```

3. Run development server:
```bash
npm run dev
```

## Project Structure

```
app/
├── api/
│   ├── auth/          # OAuth endpoints
│   └── storx/         # StorX API endpoints
├── callback/          # OAuth callback handler
├── dashboard/         # Dashboard page
└── page.tsx           # Home page

components/            # UI components
lib/                   # Utilities (crypto, storx, s3-credentials)
```
