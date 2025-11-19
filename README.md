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
STORX_OAUTH_SCOPES=read,write,list  # REQUIRED: Comma-separated OAuth scopes
```

**⚠️ IMPORTANT: Client Secret Format in .env File**

If your `STORX_CLIENT_SECRET` contains `$` characters (like bcrypt hash: `$2a$10$...`), you **MUST escape them**:

**❌ WRONG (will be truncated):**
```env
STORX_CLIENT_SECRET="$2a$10$LR75iqpT.fYmU46yOdy0BuH1nCx6gDmS91tturfasum2IKVabH1Nm"
```

**✅ CORRECT (escape $ as \$):**
```env
STORX_CLIENT_SECRET=\$2a\$10\$LR75iqpT.fYmU46yOdy0BuH1nCx6gDmS91tturfasum2IKVabH1Nm
```

**Or use without quotes (recommended):**
```env
STORX_CLIENT_SECRET=$2a$10$LR75iqpT.fYmU46yOdy0BuH1nCx6gDmS91tturfasum2IKVabH1Nm
```

**Note:** Next.js `.env` files don't require quotes. If you see only part of your secret in logs, the `$` characters weren't escaped properly.

**OAuth Scopes Configuration (REQUIRED):**
- **Environment Variable**: **REQUIRED** - Set `STORX_OAUTH_SCOPES` in `.env.local` (e.g., `read,write,list,delete`)
- **Query Parameter**: Optional - Pass `?scopes=read,write,list` to `/api/auth/login` for dynamic override
- **Note**: Scopes must be explicitly configured - no default fallback to ensure security and explicit permissions

**Available Scopes:**
- `read` - Permission to read/download files
- `write` - Permission to write/upload files
- `list` - Permission to list buckets/objects
- `delete` - Permission to delete objects
- Custom scopes as per StorX OAuth2 documentation

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
