// electron/models/emailModel.cjs
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');

/**
 * Generate embedding text from email data
 */
function generateEmbeddingText(emailData) {
  const parts = [];
  if (emailData.subject) parts.push(`Subject: ${emailData.subject}`);
  if (emailData.sender) parts.push(`From: ${emailData.sender}`);
  if (emailData.body) parts.push(emailData.body.substring(0, 500)); // Limit body length
  return parts.join('\n');
}

/**
 * Get all emails for a specific mailbox
 */
async function getEmailsByMailbox(mailbox) {
  const query = `
    SELECT * FROM emails 
    WHERE mailbox = $1 
    ORDER BY date DESC
  `;
  const result = await db.query(query, [mailbox]);
  return result.rows;
}

/**
 * Get a single email by ID
 */
async function getEmailById(id) {
  const query = 'SELECT * FROM emails WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

/**
 * Create a new email
 */
async function createEmail(emailData) {
  const {
    mailbox,
    subject,
    sender,
    recipient,
    body,
    status = 'Unread',
    attachments = []
  } = emailData;

  const query = `
    INSERT INTO emails (mailbox, subject, sender, recipient, body, status, attachments, date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `;

  const result = await db.query(query, [
    mailbox,
    subject,
    sender,
    recipient,
    body,
    status,
    JSON.stringify(attachments)
  ]);

  const newEmail = result.rows[0];

  // Generate and persist embedding asynchronously (don't block response)
  setImmediate(async () => {
    try {
      const text = generateEmbeddingText(newEmail);
      if (text && text.trim().length > 0) {
        await embeddingClient.generateAndPersistEmbedding(
          'emails',
          newEmail.id,
          text,
          { source: 'email_content' }
        );
        console.log(`[emailModel] ✓ Embedding generated for email ${newEmail.id}`);
      }
    } catch (err) {
      console.error(`[emailModel] Failed to generate embedding for email ${newEmail.id}:`, err.message);
    }
  });

  return newEmail;
}

/**
 * Update email status (Read/Unread)
 */
async function updateEmailStatus(id, status) {
  const query = `
    UPDATE emails 
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0];
}

/**
 * Delete an email
 */
async function deleteEmail(id) {
  const query = 'DELETE FROM emails WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

/**
 * Get unread count for a mailbox
 */
async function getUnreadCount(mailbox) {
  const query = `
    SELECT COUNT(*) as count 
    FROM emails 
    WHERE mailbox = $1 AND status = 'Unread'
  `;
  const result = await db.query(query, [mailbox]);
  return parseInt(result.rows[0].count);
}

module.exports = {
  getEmailsByMailbox,
  getEmailById,
  createEmail,
  updateEmailStatus,
  deleteEmail,
  getUnreadCount
};
