# PostgreSQL Setup Without Superuser Password

## Problem
You're setting up Vittoria Launchpad but don't have the PostgreSQL `postgres` superuser password.

## Solution
The setup wizard now provides **two methods** to create a PostgreSQL user:

### Method 1: Automatic (GUI-based)
If you know the postgres password, the wizard creates the user automatically.

### Method 2: Manual (Terminal command)
If you **don't** have the postgres password, the wizard generates a command for you to run.

---

## How It Works

### Step-by-Step Flow

#### 1. Initial Connection Attempt
- Enter PostgreSQL credentials (default: `postgres` user)
- Click "Test Connection"
- If authentication fails → See error message
- Click **"Create New User"** button

#### 2. User Creation Screen
You'll see a form with two sections:
- **Superuser Credentials** (for automatic creation)
- **New User Details** (usernpame & password)

#### 3. Choose Your Path

**Path A: Have postgres password?**
1. Enter postgres password in "Superuser Credentials" section
2. Set new user details
3. Click "Create User"
4. ✅ User created automatically!

**Path B: Don't have postgres password?**
1. Leave superuser password empty or enter wrong password
2. Set new user details (username & password)
3. Click "Create User"
4. ❌ Authentication fails → Manual option appears
5. Click **"Generate Manual Setup Command"**
6. Copy the command shown
7. Open a terminal and run it
8. Click **"I've Run the Command"**
9. ✅ Ready to test connection!

---

## Manual Setup Commands

### Linux (Ubuntu/Debian)

```bash
# Create PostgreSQL user with CREATEDB privilege
sudo -u postgres psql -c "CREATE USER vittoria_admin WITH PASSWORD 'your_password_here' CREATEDB;"
```

**Alternative (interactive):**
```bash
sudo -u postgres psql
CREATE USER vittoria_admin WITH PASSWORD 'your_password_here' CREATEDB;
\q
```

### What This Does
- `sudo -u postgres` - Runs command as the postgres system user (has access without password)
- `psql` - PostgreSQL command-line tool
- `CREATE USER` - Creates a new PostgreSQL user
- `WITH PASSWORD` - Sets the password
- `CREATEDB` - Grants permission to create databases
- `vittoria_admin` - Your new username (customizable in wizard)

---

## Complete Setup Example

### Scenario: Fresh PostgreSQL Install, No Password Known

1. **Start Application**
   ```bash
   npm run electron:dev
   ```

2. **Setup Wizard Appears**
   - PostgreSQL Check → ✓ Detected
   - Credentials Screen → Enter wrong password
   - Click "Test Connection" → ❌ Fails
   - Click "Create New User"

3. **User Creation Form**
   - **New User Details**:
     - Username: `vittoria_admin`
     - Password: `MySecurePass123!`
     - Confirm: `MySecurePass123!`
   - **Superuser Password**: Leave empty or enter wrong one
   - Click "Create User"

4. **Manual Option Appears**
   - Error message: "Incorrect postgres superuser password..."
   - Box appears: "Don't have the postgres password?"
   - Click **"Generate Manual Setup Command"**

5. **Terminal Command Shown**
   ```bash
   sudo -u postgres psql -c "CREATE USER vittoria_admin WITH PASSWORD 'MySecurePass123!' CREATEDB;"
   ```

6. **Copy & Run**
   - Click "Copy Command" (or copy manually)
   - Open terminal
   - Paste and run
   - Enter your Linux sudo password when prompted
   - See: `CREATE ROLE` (success!)

7. **Back to Wizard**
   - Click **"I've Run the Command"**
   - Returns to credentials screen
   - Credentials automatically filled with new user
   - Click "Test Connection"
   - ✅ Success!

8. **Continue Setup**
   - Database Creation → Automatic
   - Schema Initialization → Automatic
   - Setup Complete! → Application launches

---

## Troubleshooting

### "sudo: unknown user: postgres"

**Problem**: PostgreSQL not installed correctly or user doesn't exist.

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not installed:
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### "psql: command not found"

**Problem**: PostgreSQL client tools not in PATH.

**Solution**:
```bash
# Find psql
which psql

# If not found, install:
sudo apt install postgresql-client
```

### "CREATE ROLE" but connection still fails

**Problem**: User created but password mismatch.

**Solution**:
1. In wizard, make sure username and password match what you ran in terminal
2. Try connection test again
3. If still fails, reset password:
```bash
sudo -u postgres psql -c "ALTER USER vittoria_admin WITH PASSWORD 'NewPassword123!';"
```

### "peer authentication failed"

**Problem**: PostgreSQL is configured for `peer` authentication only.

**Solution**:
Edit PostgreSQL config to allow password authentication:
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Change this line:
# local   all             all                                     peer
# To:
# local   all             all                                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Security Notes

✅ **Safe**:
- Using `sudo -u postgres` to create user (standard PostgreSQL practice)
- Password set immediately during user creation
- User has limited privileges (only CREATEDB, not superuser)

⚠️ **Remember**:
- Choose a strong password (min 8 characters)
- Don't share your password
- The command shown in the wizard contains your password in plain text
- Clear your terminal history after running if concerned:
  ```bash
  history -c
  ```

---

## Why This Approach?

### Traditional Method (Terminal Only)
❌ Requires terminal knowledge
❌ Manual typing of complex commands
❌ Easy to make syntax errors
❌ No guidance for beginners

### Vittoria Wizard Method
✅ GUI-first approach
✅ Generates correct command for you
✅ Copy-paste ready
✅ Clear instructions at each step
✅ Fallback if automatic creation fails
✅ Validates password strength
✅ Automatically fills credentials after creation

---

## Alternative: Set Postgres Password First

If you prefer to use the automatic method, you can set the postgres password once:

```bash
# Set postgres user password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres_admin_password';"
```

Then in the wizard:
1. Go to "Create New User"
2. Enter this password in "Superuser Credentials"
3. Click "Create User"
4. ✅ User created automatically!

---

## Next Steps

After user creation succeeds:
1. ✅ Test Connection → Success
2. → Database Creation (automatic)
3. → Schema Initialization (automatic)
4. → Configuration Saved
5. → Setup Complete
6. 🚀 Application Launches!

---

## Summary

**You have 3 options:**

1. **Know postgres password** → Use automatic creation (easiest)
2. **Don't know password** → Use manual command (this guide)
3. **Want automatic** → Set postgres password first, then use automatic

The wizard supports all three workflows seamlessly! 🎉
