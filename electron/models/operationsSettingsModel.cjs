// electron/models/operationsSettingsModel.cjs
const db = require('../db/pgConnection.cjs');

/**
 * Get all mailbox configurations
 */
async function getAllMailboxes() {
  const query = 'SELECT * FROM operations_mailboxes ORDER BY email ASC';
  const result = await db.query(query);
  return result.rows;
}

/**
 * Update mailbox access level
 */
async function updateMailboxAccess(email, access) {
  const query = `
    UPDATE operations_mailboxes 
    SET access_level = $1, updated_at = NOW()
    WHERE email = $2
    RETURNING *
  `;
  const result = await db.query(query, [access, email]);
  
  // If no rows affected, insert new mailbox
  if (result.rows.length === 0) {
    const insertQuery = `
      INSERT INTO operations_mailboxes (email, access_level)
      VALUES ($1, $2)
      RETURNING *
    `;
    const insertResult = await db.query(insertQuery, [email, access]);
    return insertResult.rows[0];
  }
  
  return result.rows[0];
}

/**
 * Get all integration statuses
 */
async function getAllIntegrations() {
  const query = 'SELECT * FROM operations_integrations ORDER BY name ASC';
  const result = await db.query(query);
  return result.rows;
}

/**
 * Update integration status
 */
async function updateIntegrationStatus(name, status) {
  const query = `
    UPDATE operations_integrations 
    SET status = $1, updated_at = NOW()
    WHERE name = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, name]);
  
  // If no rows affected, insert new integration
  if (result.rows.length === 0) {
    const insertQuery = `
      INSERT INTO operations_integrations (name, status)
      VALUES ($1, $2)
      RETURNING *
    `;
    const insertResult = await db.query(insertQuery, [name, status]);
    return insertResult.rows[0];
  }
  
  return result.rows[0];
}

/**
 * Get user preferences
 */
async function getUserPreferences() {
  const query = 'SELECT * FROM operations_preferences LIMIT 1';
  const result = await db.query(query);
  return result.rows[0] || {
    email_signature: '',
    email_alerts: true,
    calendar_reminders: true,
    document_updates: false
  };
}

/**
 * Update user preferences
 */
async function updateUserPreferences(preferences) {
  const {
    email_signature,
    email_alerts,
    calendar_reminders,
    document_updates
  } = preferences;

  // Check if preferences exist
  const checkQuery = 'SELECT id FROM operations_preferences LIMIT 1';
  const checkResult = await db.query(checkQuery);

  if (checkResult.rows.length > 0) {
    // Update existing
    const query = `
      UPDATE operations_preferences 
      SET email_signature = $1,
          email_alerts = $2,
          calendar_reminders = $3,
          document_updates = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    const result = await db.query(query, [
      email_signature,
      email_alerts,
      calendar_reminders,
      document_updates,
      checkResult.rows[0].id
    ]);
    return result.rows[0];
  } else {
    // Insert new
    const query = `
      INSERT INTO operations_preferences 
        (email_signature, email_alerts, calendar_reminders, document_updates)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [
      email_signature,
      email_alerts,
      calendar_reminders,
      document_updates
    ]);
    return result.rows[0];
  }
}

module.exports = {
  getAllMailboxes,
  updateMailboxAccess,
  getAllIntegrations,
  updateIntegrationStatus,
  getUserPreferences,
  updateUserPreferences
};
