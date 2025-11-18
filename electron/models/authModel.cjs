// ============================================================
// POSTGRESQL VERSION (ACTIVE)
// ============================================================
const { query } = require("../db/pgConnection.cjs");
const crypto = require("crypto");

/**
 * Initialize users table with default admin user (PostgreSQL)
 * NOTE: This is now handled by databaseInitializer.cjs during setup
 * Keeping this function for manual initialization if needed
 */
async function initUsersTable() {
  // Note: Table creation is handled by setup wizard
  // This function just ensures default admin exists
  
  // Check if default admin exists
  const result = await query(
    "SELECT id FROM users WHERE username = $1",
    ["admin"]
  );

  if (result.rows.length === 0) {
    // Create default admin user (username: admin, password: admin123)
    const defaultPassword = "admin123";
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(defaultPassword, salt);

    await query(
      `INSERT INTO users (username, password_hash, salt, full_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ["admin", passwordHash, salt, "Administrator", "admin"]
    );

    console.log(
      "[authModel] Default admin user created (username: admin, password: admin123)"
    );
  }
}

/**
 * Hash password with salt using SHA-256
 */
function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha256")
    .toString("hex");
}

/**
 * Create a new user (PostgreSQL)
 */
async function createUser(username, password, fullName = null, role = "user") {
  // Check if username already exists
  const existing = await query(
    "SELECT id FROM users WHERE username = $1",
    [username]
  );

  if (existing.rows.length > 0) {
    throw new Error("Username already exists");
  }

  // Generate salt and hash password
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  // Insert new user and return ID
  const result = await query(
    `INSERT INTO users (username, password_hash, salt, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [username, passwordHash, salt, fullName, role]
  );

  return result.rows[0].id;
}

/**
 * Authenticate user with username and password (PostgreSQL)
 * Returns user object if successful, null otherwise
 */
async function authenticateUser(username, password) {
  // Get user by username
  const result = await query(
    `SELECT id, username, password_hash, salt, full_name, role, is_active
     FROM users
     WHERE username = $1 AND is_active = true`,
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Verify password
  const passwordHash = hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) {
    return null;
  }

  // Update last login timestamp
  await query(
    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
    [user.id]
  );

  // Return user info (without password hash and salt)
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
  };
}

/**
 * Get user by ID (PostgreSQL)
 */
async function getUserById(userId) {
  const result = await query(
    `SELECT id, username, full_name, role, is_active, created_at, last_login
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  };
}

/**
 * List all users (PostgreSQL)
 */
async function listUsers() {
  const result = await query(
    `SELECT id, username, full_name, role, is_active, created_at, last_login
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows.map((user) => ({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  }));
}

/**
 * Update user password (PostgreSQL)
 */
async function updateUserPassword(userId, newPassword) {
  // Generate new salt and hash
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, salt);

  await query(
    "UPDATE users SET password_hash = $1, salt = $2 WHERE id = $3",
    [passwordHash, salt, userId]
  );
}

/**
 * Deactivate user (PostgreSQL)
 */
async function deactivateUser(userId) {
  await query("UPDATE users SET is_active = false WHERE id = $1", [userId]);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT - KEPT FOR REFERENCE)
// ============================================================
// const initDatabase = require("../db/connection.cjs");
// const crypto = require("crypto");
//
// async function initUsersTable(db) {
//   if (!db) {
//     db = await initDatabase();
//   }
//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT UNIQUE NOT NULL,
//       password_hash TEXT NOT NULL,
//       salt TEXT NOT NULL,
//       full_name TEXT,
//       role TEXT DEFAULT 'user',
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       last_login TEXT,
//       CHECK (role IN ('admin', 'user'))
//     );
//   `);
//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
//   `);
//   const adminExists = await db.get(
//     "SELECT id FROM users WHERE username = ?",
//     ["admin"]
//   );
//   if (!adminExists) {
//     const defaultPassword = "admin123";
//     const salt = crypto.randomBytes(16).toString("hex");
//     const passwordHash = hashPassword(defaultPassword, salt);
//     await db.run(
//       `INSERT INTO users (username, password_hash, salt, full_name, role)
//        VALUES (?, ?, ?, ?, ?)`,
//       ["admin", passwordHash, salt, "Administrator", "admin"]
//     );
//   }
// }
//
// async function createUser(username, password, fullName = null, role = "user") {
//   const db = await initDatabase();
//   const existing = await db.get(
//     "SELECT id FROM users WHERE username = ?",
//     [username]
//   );
//   if (existing) {
//     throw new Error("Username already exists");
//   }
//   const salt = crypto.randomBytes(16).toString("hex");
//   const passwordHash = hashPassword(password, salt);
//   const result = await db.run(
//     `INSERT INTO users (username, password_hash, salt, full_name, role)
//      VALUES (?, ?, ?, ?, ?)`,
//     [username, passwordHash, salt, fullName, role]
//   );
//   return result.lastID;
// }
//
// async function authenticateUser(username, password) {
//   const db = await initDatabase();
//   const user = await db.get(
//     `SELECT id, username, password_hash, salt, full_name, role, is_active
//      FROM users
//      WHERE username = ? AND is_active = 1`,
//     [username]
//   );
//   if (!user) {
//     return null;
//   }
//   const passwordHash = hashPassword(password, user.salt);
//   if (passwordHash !== user.password_hash) {
//     return null;
//   }
//   await db.run(
//     "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
//     [user.id]
//   );
//   return {
//     id: user.id,
//     username: user.username,
//     fullName: user.full_name,
//     role: user.role,
//   };
// }
//
// async function getUserById(userId) {
//   const db = await initDatabase();
//   const user = await db.get(
//     `SELECT id, username, full_name, role, is_active, created_at, last_login
//      FROM users
//      WHERE id = ?`,
//     [userId]
//   );
//   if (!user) {
//     return null;
//   }
//   return {
//     id: user.id,
//     username: user.username,
//     fullName: user.full_name,
//     role: user.role,
//     isActive: user.is_active === 1,
//     createdAt: user.created_at,
//     lastLogin: user.last_login,
//   };
// }
//
// async function listUsers() {
//   const db = await initDatabase();
//   const users = await db.all(
//     `SELECT id, username, full_name, role, is_active, created_at, last_login
//      FROM users
//      ORDER BY created_at DESC`
//   );
//   return users.map((user) => ({
//     id: user.id,
//     username: user.username,
//     fullName: user.full_name,
//     role: user.role,
//     isActive: user.is_active === 1,
//     createdAt: user.created_at,
//     lastLogin: user.last_login,
//   }));
// }
//
// async function updateUserPassword(userId, newPassword) {
//   const db = await initDatabase();
//   const salt = crypto.randomBytes(16).toString("hex");
//   const passwordHash = hashPassword(newPassword, salt);
//   await db.run(
//     "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
//     [passwordHash, salt, userId]
//   );
// }
//
// async function deactivateUser(userId) {
//   const db = await initDatabase();
//   await db.run("UPDATE users SET is_active = 0 WHERE id = ?", [userId]);
// }
// ============================================================

module.exports = {
  initUsersTable,
  createUser,
  authenticateUser,
  getUserById,
  listUsers,
  updateUserPassword,
  deactivateUser,
};
