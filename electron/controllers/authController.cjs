const { ipcMain } = require("electron");
const { authenticateUser, getUserById } = require("../models/authModel.cjs");

// In-memory session store (for simplicity; could be moved to SQLite or file)
const sessions = new Map();

/**
 * Generate a simple session token
 */
function generateSessionToken() {
  return require("crypto").randomBytes(32).toString("hex");
}

/**
 * Register authentication IPC handlers
 */
function registerAuthIpcHandlers() {
  /**
   * Handle login request
   */
  ipcMain.handle("auth:login", async (_event, { username, password }) => {
    try {
      // Authenticate user
      const user = await authenticateUser(username, password);

      if (!user) {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }

      // Generate session token
      const sessionToken = generateSessionToken();

      // Store session
      sessions.set(sessionToken, {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        loginTime: new Date().toISOString(),
      });

      console.log(`[authController] User ${username} logged in successfully`);

      return {
        success: true,
        sessionToken,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("[authController] Login error:", error);
      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  });

  /**
   * Handle logout request
   */
  ipcMain.handle("auth:logout", async (_event, sessionToken) => {
    if (sessionToken && sessions.has(sessionToken)) {
      const session = sessions.get(sessionToken);
      console.log(`[authController] User ${session.username} logged out`);
      sessions.delete(sessionToken);
    }
    return { success: true };
  });

  /**
   * Validate session token
   */
  ipcMain.handle("auth:validateSession", async (_event, sessionToken) => {
    if (!sessionToken || !sessions.has(sessionToken)) {
      return {
        valid: false,
      };
    }

    const session = sessions.get(sessionToken);

    // Optionally refresh user data from DB
    try {
      const user = await getUserById(session.userId);
      if (!user || !user.isActive) {
        sessions.delete(sessionToken);
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("[authController] Session validation error:", error);
      return { valid: false };
    }
  });

  /**
   * Get current user info
   */
  ipcMain.handle("auth:getCurrentUser", async (_event, sessionToken) => {
    if (!sessionToken || !sessions.has(sessionToken)) {
      return null;
    }

    const session = sessions.get(sessionToken);

    try {
      const user = await getUserById(session.userId);
      if (!user || !user.isActive) {
        sessions.delete(sessionToken);
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      };
    } catch (error) {
      console.error("[authController] Get current user error:", error);
      return null;
    }
  });

  console.log("[authController] Authentication IPC handlers registered");
}

module.exports = {
  registerAuthIpcHandlers,
};
