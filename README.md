# **BWS Vittoria — Desktop Application**

*A modern Electron + React platform for intake, parsing, scoring, and approvals in executive search.*

---

## **Table of Contents**

* [Overview](#overview)
* [Features](#features)
* [Tech Stack](#tech-stack)
* [Project Structure](#project-structure)
* [Development Setup](#development-setup)

  * [Prerequisites](#prerequisites)
  * [Clone & Run](#clone--run)
* [Database Setup (Windows / Linux / macOS)](#database-setup-windows--linux--macos)

  * [1. Install PostgreSQL](#1-install-postgresql)
  * [2. Create Database and User](#2-create-the-database--user)
  * [3. Verify Connection](#3-verify-postgresql-connection)
  * [4. Configure PostgreSQL in BWS Vittoria](#4-configure-postgresql-in-bws-vittoria)
  * [5. Setup Flow Inside the App](#5-setup-flow-inside-the-app)
  * [6. Database Connection Flow (Internal)](#6-database-connection-flow-internal)
  * [7. Optional: pg_hbaconf for Password Auth](#7-optional-pg_hbaconf-allow-local-password-auth)
* [Intake Pipeline](#intake-pipeline)
* [Scoring Engine](#scoring-engine)
* [Source Ingestion](#source-ingestion)
* [Finance Module](#finance-module)
* [Packaging & Distribution](#packaging--distribution)
* [Troubleshooting](#troubleshooting)
* [Key Code Locations](#key-code-locations)

---

# **Overview**

BWS Vittoria is a cross-platform desktop application built to support full-cycle executive search workflows:

* CV intake
* OCR and AI enrichment
* Candidate scoring
* Approvals & provenance tracking
* Mandates, firms, and placements
* Finance (transactions & invoices)
* Settings, audit, integrations

It is built for **offline-first use**, with a local PostgreSQL database and strong emphasis on privacy.

---

# **Features**

### **Intake & Parsing**

* Upload single CVs or entire folders
* OCR for scanned/image CVs
* AI enrichment (OpenAI via LangChain)
* Field-level confidence + provenance
* Editable structured output
* Approvals workflow (approve, defer, edit, reject)

### **Scoring**

* OCR-only quick score
* Enriched score after LLM processing
* Quality, expertise, similarity-style scoring
* Stored rationale + provenance

### **Candidate & Mandate Management**

* Candidates, firms, mandates, teams
* Linking candidates ↔ mandates
* Timeline events + audit logs

### **Finance**

* Transactions, invoices, multi-currency
* Exchange rate handling
* Dashboard totals + aggregates

### **Desktop Application**

* Electron main process
* React (Vite + Shadcn UI)
* Automatic DB migrations
* Native installers for Linux / Windows

---

# **Tech Stack**

| Layer         | Technology                            |
| ------------- | ------------------------------------- |
| Desktop shell | **Electron**                          |
| UI            | **React + Vite + Shadcn UI**          |
| DB            | **PostgreSQL** (local)                |
| OCR           | **Tesseract.js + Jimp preprocessing** |
| AI enrichment | **OpenAI (LangChain adapter)**        |
| Packaging     | **electron-builder**                  |
| Backend logic | Node.js (CommonJS) inside `electron/` |

---

# **Project Structure**

```text
vittoria-launchpad/
│
├── electron/               # Electron main process & backend services
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── setup/
│   └── main.cjs
│
├── src/                    # React renderer
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── App.tsx
│
├── db/                     # DB connection
├── migrations/             # SQL migration scripts
├── scripts/                # build helpers, icon generation
├── release/                # built installers
├── public/                 # static assets
└── package.json            # scripts & build config
```

---

# **Development Setup**

## **Prerequisites**

* Node.js (use `nvm` recommended)
* npm
* PostgreSQL 13+ (16+ recommended)
* **pgvector extension** for semantic search (see installation below)
* Ubuntu / Windows / macOS

---

## **Clone & Run**

```bash
git clone <REPO_URL>
cd vittoria-launchpad
npm install --include=optional
```

### **Start UI only (Vite)**

```bash
npm run dev
```

### **Start Desktop App (Electron + UI)**

```bash
npm run electron:dev
```

---

# **Database Setup (Windows / Linux / macOS)**

BWS Vittoria uses a **local PostgreSQL database** for all data.
The application includes a first-run **Setup / Database** screen that tests connectivity and automatically runs migrations.

This section explains how to install PostgreSQL and how the app connects and initializes the schema.

---

## **1. Install PostgreSQL**

### **Linux (Ubuntu/Debian)**

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

**Install pgvector extension for semantic search:**

```bash
# For PostgreSQL 16
sudo apt install postgresql-16-pgvector

# For other versions, replace 16 with your version number
# e.g., postgresql-15-pgvector, postgresql-14-pgvector
```

Start and enable the service:

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

---

### **Windows (10/11)**

#### Option A: Official Installer (Recommended)

Download:
👉 [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)

* Run the installer
* Select default components
* Set a password for the `postgres` superuser
* Optionally install pgAdmin for GUI management

**Install pgvector extension:**

After installing PostgreSQL, download and install pgvector:
👉 [https://github.com/pgvector/pgvector/releases](https://github.com/pgvector/pgvector/releases)

Or compile from source (requires Visual Studio Build Tools):
```powershell
git clone https://github.com/pgvector/pgvector.git
cd pgvector
# Follow Windows compilation instructions in pgvector README
```

#### Option B: Chocolatey (Command-line)

```powershell
choco install postgresql
```

Add PostgreSQL to PATH (if needed):

```powershell
setx PATH "%PATH%;C:\Program Files\PostgreSQL\16\bin"
```

(Replace `16` with your installed version.)

---### **macOS (Homebrew)**

```bash
brew install postgresql
brew services start postgresql
```

---

## **2. Create the Database + User**

The application should **not** use the `postgres` superuser.
Create a dedicated user + database for Vittoria.

### **Linux / macOS**

```bash
sudo -u postgres createuser -P vittoria_user
sudo -u postgres createdb -O vittoria_user vittoria_db
```

**Enable pgvector extension (as postgres superuser):**

```bash
sudo -u postgres psql -d vittoria_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

You will be prompted for a password — keep it for the app config.

---

### **Windows (PowerShell)**

Open PowerShell as Administrator:

```powershell
psql -U postgres
```

Inside the PostgreSQL prompt:

```sql
CREATE USER vittoria_user WITH PASSWORD 'your_password';
CREATE DATABASE vittoria_db OWNER vittoria_user;

-- Enable pgvector extension
\c vittoria_db
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## **3. Verify PostgreSQL Connection**

Before using the app, verify manually.

### Linux / macOS

```bash
psql -h localhost -U vittoria_user -d vittoria_db
```

### Windows (PowerShell)

```powershell
psql -h localhost -U vittoria_user -d vittoria_db
```

If you get a `vittoria_db=#` prompt, the credentials are correct.

**Verify pgvector is installed:**

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

You should see one row with `vector` extension.

---

## **4. Configure PostgreSQL in BWS Vittoria**

Launch the Vittoria desktop app → the first screen is **Setup / Database**.

Fill in:

| Field    | Value           |
| -------- | --------------- |
| Host     | `localhost`     |
| Port     | `5432`          |
| Database | `vittoria_db`   |
| Username | `vittoria_user` |
| Password | your password   |

Then:

1. Click **Test Connection**
2. If it succeeds, click **Save**

### What happens automatically

After you save:

1. The app writes the connection into local encrypted settings
2. It connects to PostgreSQL using these credentials
3. It attempts to create the pgvector extension (will show warning if permission denied)
4. It runs all SQL migrations in `migrations/` including embedding column additions
5. It initializes:

   * system settings
   * admin user storage
   * audit triggers
   * candidate / intake / source / finance tables
   * **embedding columns for semantic search (vector(384) with pgvector)**

**Note:** If the app cannot create the pgvector extension due to permissions, you'll see a warning.
In this case, you must manually create the extension as superuser (see step 2 above).
The app will work normally for all features except semantic search until the extension is created.

---

## **5. Setup Flow Inside the App**

After DB connection succeeds:

### Step 1 — Create Admin User

You’ll see an Admin Setup screen:

* Create an admin username + password
* Optionally capture company / configuration details

### Step 2 — Dashboard

Once setup is complete, the app loads the **Dashboard**, showing:

* Recent intake items
* System health
* Pending approvals and alerts

### Step 3 — Ready to Use

You can now:

* Upload CVs
* Run intake & scoring
* Create firms, mandates, and candidates
* Configure OpenAI keys (Settings → Integrations)
* Use Finance for transactions and invoices

---

## **6. Database Connection Flow (Internal)**

```text
┌───────────────────┐
│ User opens app    │
└─────────┬─────────┘
          │
          ▼
┌──────────────────────────┐
│ Check saved DB settings  │
└─────────┬────────────────┘
          │ missing / invalid
          ▼
┌──────────────────────────┐
│ Show Setup / Database UI │
└─────────┬────────────────┘
          │ user enters host/user/pass
          ▼
┌────────────────────────────┐
│ Test connection with pg    │
└─────────┬──────────────────┘
          │ success
          ▼
┌────────────────────────────┐
│ Run SQL migrations         │
└─────────┬──────────────────┘
          │
          ▼
┌────────────────────────────┐
│ Setup admin user           │
└─────────┬──────────────────┘
          │
          ▼
┌────────────────────────────┐
│ Load Dashboard             │
└────────────────────────────┘
```

This is how Vittoria initializes a new environment on any machine.

---

## **7. Optional: `pg_hba.conf` Allow Local Password Auth**

If PostgreSQL refuses passwords (common on some Linux setups), edit:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Change:

```text
local   all             all             peer
```

to:

```text
local   all             all             md5
```

Then restart:

```bash
sudo systemctl restart postgresql
```

---

# **Intake Pipeline**

### **1) Upload**

* Supported formats: `.pdf`, `.docx`, `.jpg`, `.png`, `.tiff`
* Single-file or folder import with preview modal (review/remove files before processing).

### **2) Preprocessing**

* Grayscale
* Resize and normalize
* Handled by `electron/services/ocrService.cjs` using Jimp (pure JS).

### **3) OCR**

* Tesseract.js extracts text + confidence values.

### **4) Parsing + AI Enrichment**

* Extracts fields like name, experience, roles, sectors, functions, skills, geographies, seniority.
* Optionally sends content to LLM enrichment (OpenAI via LangChain adapter).
* OpenAI key is configured in **Settings → Integrations**.

### **5) Scoring**

Two-stage scoring:

* **Initial score**: based on OCR-only parse for quick feedback.
* **Final score**: after AI enrichment, stored as `finalQualityResult.score`.

### **6) Approvals Queue**

In the Approvals UI (e.g. `src/pages/Approvals.tsx`, `src/pages/Intake.tsx`) you can:

* Edit in place (updates `parsed_json`)
* Approve (creates candidate in `candidates` table)
* Defer (moves to defer queue)
* Reject (removes from queue)

### **7) Candidate Provenance**

* Field-level provenance and confidence values are stored for auditing.
* Audit triggers defined in `electron/setup/databaseInitializer.cjs`.

---

# **Scoring Engine**

Located at:

```text
electron/models/scoringModel.cjs
```

Components include:

* OCR completeness
* Education & experience depth
* AI parser/enrichment confidence
* Mandate expertise match (sector / function / geography / seniority)
* Similarity vs. benchmark candidates

Stored data:

* Numeric scores
* Breakdown & rationale
* Confidence metadata for each component

---

# **Source Ingestion**

### Code locations

* `electron/controllers/sourceController.cjs`
* `electron/services/ingestService.cjs` (if present)

### Flow

1. Define a source (folder/email) via UI or settings
2. Source worker monitors for new documents
3. New intake files are created in `intake_files`
4. Each file runs through the same OCR → parsing → scoring pipeline
5. Results appear in the Approvals queue

---

# **Finance Module**

Main UI:

```text
src/pages/FinanceTransactions.tsx
```

Supports:

* Multi-currency transactions & invoices
* Per-transaction original currency + converted display currency
* Aggregations and totals in a reporting currency
* Handling of missing exchange rates and fallbacks

Basic flow:

1. Create transaction/invoice with amount + currency
2. Use `exchangeRates` and `displayCurrency` state for consistent display
3. Persist both original and converted values for auditability

---

# **Packaging & Distribution**

### **Linux (Ubuntu/Debian)**

Install build prerequisites:

```bash
sudo apt-get update
sudo apt-get install -y build-essential libx11-dev libxkbfile-dev
```

Generate icons (if needed):

```bash
npm run generate-icons
```

Build Linux installer:

```bash
npm run electron:build:linux
```

Artifacts appear in:

```text
release/
```

### **Windows**

Requires:

* Node.js
* Python
* Visual Studio Build Tools

Build:

```powershell
npm run electron:build:win
```

---

# **Troubleshooting**

### **Sharp / libvips Error**

If you see something like:

```text
ERR_DLOPEN_FAILED: libvips-cpp.so.*
```

Fix:

```bash
rm -rf node_modules package-lock.json
npm install --include=optional
npx @electron/rebuild -f -w sharp
npm run electron:build:linux
```

(Or rebuild using your platform-specific build script.)

### **Postgres Connection Fails**

* Ensure the Postgres service is running
* Double-check DB name, user, and password
* Test manually using `psql` as shown earlier
* On Linux, verify `pg_hba.conf` authentication method (switch `peer` → `md5` if needed)

### **Icons Missing in Built App**

Run:

```bash
npm run generate-icons
```

and rebuild.

### **OCR Feels Slow**

Optional: install native Tesseract for improved performance:

```bash
sudo apt install tesseract-ocr
```

---

# **Key Code Locations**

| Area                  | Files                                                   |
| --------------------- | ------------------------------------------------------- |
| OCR & preprocessing   | `electron/services/ocrService.cjs`                      |
| Intake UI             | `src/pages/Intake.tsx`                                  |
| Approvals             | `src/pages/Approvals.tsx`                               |
| Scoring               | `electron/models/scoringModel.cjs`                      |
| Candidate persistence | `electron/models/candidateModel.cjs`                    |
| DB setup & migrations | `electron/setup/databaseInitializer.cjs`, `migrations/` |
| Source ingestion      | `electron/controllers/sourceController.cjs`             |
| Finance               | `src/pages/FinanceTransactions.tsx`                     |
| Electron startup      | `electron/main.cjs`                                     |
| Build config          | `package.json`, `scripts/`                              |

---
