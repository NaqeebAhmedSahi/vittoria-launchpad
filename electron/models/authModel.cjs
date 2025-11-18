const initDatabase = require("../db/connection.cjs");
const crypto = require("crypto");

/**
 * Initialize users table with default admin user
 */
async function initUsersTable(db) {
  if (!db) {
    db = await initDatabase();
  }

  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      CHECK (role IN ('admin', 'user'))
    );
  `);

  // Create index on username
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Check if default admin exists
  const adminExists = await db.get(
    "SELECT id FROM users WHERE username = ?",
    ["admin"]
  );

  if (!adminExists) {
    // Create default admin user (username: admin, password: admin123)
    const defaultPassword = "admin123";
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(defaultPassword, salt);

    await db.run(
      `INSERT INTO users (username, password_hash, salt, full_name, role)
       VALUES (?, ?, ?, ?, ?)`,
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
 * Create a new user
 */
async function createUser(username, password, fullName = null, role = "user") {
  const db = await initDatabase();

  // Check if username already exists
  const existing = await db.get(
    "SELECT id FROM users WHERE username = ?",
    [username]
  );

  if (existing) {
    throw new Error("Username already exists");
  }

  // Generate salt and hash password
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  // Insert new user
  const result = await db.run(
    `INSERT INTO users (username, password_hash, salt, full_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    [username, passwordHash, salt, fullName, role]
  );

  return result.lastID;
}

/**
 * Authenticate user with username and password
 * Returns user object if successful, null otherwise
 */
async function authenticateUser(username, password) {
  const db = await initDatabase();

  // Get user by username
  const user = await db.get(
    `SELECT id, username, password_hash, salt, full_name, role, is_active
     FROM users
     WHERE username = ? AND is_active = 1`,
    [username]
  );

  if (!user) {
    return null;
  }

  // Verify password
  const passwordHash = hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) {
    return null;
  }

  // Update last login timestamp
  await db.run(
    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
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
 * Get user by ID
 */
async function getUserById(userId) {
  const db = await initDatabase();

  const user = await db.get(
    `SELECT id, username, full_name, role, is_active, created_at, last_login
     FROM users
     WHERE id = ?`,
    [userId]
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active === 1,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  };
}

/**
 * List all users
 */
async function listUsers() {
  const db = await initDatabase();

  const users = await db.all(
    `SELECT id, username, full_name, role, is_active, created_at, last_login
     FROM users
     ORDER BY created_at DESC`
  );

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active === 1,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  }));
}

/**
 * Update user password
 */
async function updateUserPassword(userId, newPassword) {
  const db = await initDatabase();

  // Generate new salt and hash
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, salt);

  await db.run(
    "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
    [passwordHash, salt, userId]
  );
}

/**
 * Deactivate user
 */
async function deactivateUser(userId) {
  const db = await initDatabase();
  await db.run("UPDATE users SET is_active = 0 WHERE id = ?", [userId]);
}

module.exports = {
  initUsersTable,
  createUser,
  authenticateUser,
  getUserById,
  listUsers,
  updateUserPassword,
  deactivateUser,
};
