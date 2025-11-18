# PostgreSQL User Creation Guide

## Overview
The Vittoria Launchpad setup wizard now includes **fully GUI-based PostgreSQL user creation**. You don't need to use the terminal or know PostgreSQL commands!

## What's New

### 1. Automatic User Creation Flow
When you try to connect to PostgreSQL and authentication fails, the setup wizard will:
- Detect the authentication error
- Offer to create a new PostgreSQL user for you
- Guide you through the process with a simple form

### 2. How It Works

#### Step 1: Try Connection
1. Enter your PostgreSQL credentials (default: `postgres` user)
2. Click "Test Connection"
3. If authentication fails, you'll see two options:
   - Try different credentials
   - **Create New User** ← Click this!

#### Step 2: Create User Screen
The wizard will show you a form with two sections:

**Superuser Credentials (postgres)**
- Enter the password for the default `postgres` superuser
- This is only used once to create your new user
- Never stored permanently

**New User Details**
- Username: `vittoria_admin` (or customize it)
- Password: Choose a strong password (min 8 characters)
- Confirm Password: Re-enter to confirm

#### Step 3: Automatic Setup
When you click "Create User", the wizard will:
1. Connect to PostgreSQL as superuser
2. Create your new user with CREATEDB privileges
3. Automatically switch to use the new credentials
4. Return to the credentials screen
5. Test connection with your new user

### 3. Security Features
- ✅ Superuser password is never stored
- ✅ New user has limited privileges (only database creation)
- ✅ Password validation (minimum 8 characters)
- ✅ Password confirmation to prevent typos
- ✅ Clear error messages if something goes wrong

### 4. What If I Don't Know the Postgres Password?

If you just installed PostgreSQL and don't know the `postgres` user password, you have two options:

**Option A: Set it via terminal** (one-time only)
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'your-password';
\q
```

**Option B: Use system authentication**
Some PostgreSQL installations allow system user authentication. Try leaving the password empty first.

## Technical Details

### New IPC Handler
- **Handler**: `setup:createUser`
- **Location**: `electron/setup/setupController.cjs`
- **Action**: Creates PostgreSQL user with CREATEDB privilege

### Code Flow
```
testConnection fails (auth error)
    ↓
Show "Create New User" button
    ↓
User clicks → Navigate to 'create-user' step
    ↓
User enters superuser password + new user details
    ↓
Call api.setup.createUser({ superuser, newUser })
    ↓
Backend connects as postgres → CREATE USER
    ↓
Update credentials with new user
    ↓
Return to credentials screen → Test connection
    ↓
Success! → Continue to database creation
```

### Files Modified
1. **electron/setup/setupController.cjs** - Added `setup:createUser` IPC handler
2. **electron/preload.cjs** - Exposed `createUser` API method
3. **src/types/electron.d.ts** - Added TypeScript definitions
4. **src/pages/Setup.tsx** - Added user creation UI step

## Usage Example

### Scenario: Fresh PostgreSQL Installation

1. **Start Application** → Setup wizard appears
2. **PostgreSQL Check** → ✓ Detected
3. **Enter Credentials**:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: `wrongpassword`
4. **Click "Test Connection"** → ❌ Authentication failed
5. **Click "Create New User"** → User creation form appears
6. **Enter Superuser Password**: `correct_postgres_password`
7. **Set New User**:
   - Username: `vittoria_admin`
   - Password: `secure_password_123`
   - Confirm: `secure_password_123`
8. **Click "Create User"** → ✓ User created!
9. **Automatically tests new credentials** → ✓ Success!
10. **Continue to database creation** → Complete setup

## Benefits

✅ **No Terminal Commands Required** - Everything through GUI
✅ **User-Friendly Error Messages** - Clear guidance at each step
✅ **Automatic Credential Switch** - Seamlessly uses new user
✅ **Secure** - Superuser password never stored
✅ **Flexible** - Works with any PostgreSQL version/platform
✅ **Recoverable** - Can go back and try different approaches

## Next Steps

After user creation succeeds, the setup wizard will:
1. Create the `vittoria_launchpad` database
2. Initialize the schema (tables, indexes, triggers)
3. Save your configuration securely
4. Mark setup as complete
5. Launch the main application

---

**Ready to test?** Just run `npm run electron:dev` and follow the wizard! 🚀
