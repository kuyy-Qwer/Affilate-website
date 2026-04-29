# Server Firebase Initialization Fix

## Problem
Server was throwing error when running `npm run dev`:
```
Error: Missing SERVICE_ACCOUNT_KEY environment variable
```

The server only supported production mode (Railway) with environment variable, but not local development.

## Solution Implemented

Modified `server.ts` to support **both** production and local development modes:

### 1. **Production Mode (Railway)**
- Uses `SERVICE_ACCOUNT_KEY` environment variable
- JSON string stored in Railway project variables
- Automatically detected when env var exists

### 2. **Local Development Mode**
- Uses `serviceAccountKey.json` file in project root
- Automatically falls back when env var not found
- Includes helpful error messages if file missing

## Code Changes

**File**: `server.ts` (lines 1-90)

### Key Features:
- ✅ Synchronous file reading with `fs.readFileSync()`
- ✅ File existence check with `fs.existsSync()`
- ✅ Proper error handling with setup instructions
- ✅ Clear console messages for debugging
- ✅ `db` variable properly initialized after Firebase setup

## Verification

Server now starts successfully:
```bash
npm run dev

# Output:
🔧 Initializing Firebase with serviceAccountKey.json file...
✅ Firebase initialized successfully (local development mode)
Server running on http://localhost:3000
```

## Setup Instructions

### For Local Development:
1. Download Firebase service account key from Firebase Console
2. Save as `serviceAccountKey.json` in project root
3. Ensure file is in `.gitignore` (already configured)
4. Run `npm run dev`

### For Production (Railway):
1. Go to Railway project settings
2. Add environment variable: `SERVICE_ACCOUNT_KEY`
3. Paste entire JSON content of service account key
4. Deploy

## Files Modified
- `server.ts` - Firebase initialization section (lines 1-90)

## Status
✅ **FIXED** - Server running successfully on http://localhost:3000
