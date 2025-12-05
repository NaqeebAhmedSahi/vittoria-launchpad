// electron/models/contactModel.cjs
// Contact model for Microsoft 365 compatible contact management

const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');

/**
 * Generate embedding text from contact data
 */
function generateEmbeddingText(contactData) {
  const parts = [];
  if (contactData.display_name) parts.push(contactData.display_name);
  if (contactData.company_name) parts.push(`Company: ${contactData.company_name}`);
  if (contactData.job_title) parts.push(`Title: ${contactData.job_title}`);
  if (contactData.email_address) parts.push(`Email: ${contactData.email_address}`);
  if (contactData.department) parts.push(`Department: ${contactData.department}`);
  return parts.join(' | ');
}

/**
 * Get all contacts with optional search filter
 */
async function getAllContacts(searchTerm = '') {
  let query = `
    SELECT 
      id, display_name, given_name, surname, middle_name, title,
      company_name, department, job_title, email_address,
      business_phones, mobile_phone, home_phones,
      business_address, home_address, other_address,
      birthday, personal_notes, categories,
      microsoft_id, is_synced, last_synced_at,
      created_at, updated_at
    FROM contacts
  `;
  
  const params = [];
  
  if (searchTerm && searchTerm.trim()) {
    query += ` WHERE 
      display_name ILIKE $1 OR 
      email_address ILIKE $1 OR 
      company_name ILIKE $1 OR
      job_title ILIKE $1 OR
      given_name ILIKE $1 OR
      surname ILIKE $1
    `;
    params.push(`%${searchTerm.trim()}%`);
  }
  
  query += ` ORDER BY display_name ASC`;
  
  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Get a single contact by ID
 */
async function getContactById(id) {
  const result = await db.query(
    `SELECT * FROM contacts WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new contact
 */
async function createContact(contactData) {
  const {
    displayName,
    givenName,
    surname,
    middleName,
    title,
    companyName,
    department,
    jobTitle,
    emailAddress,
    businessPhones = [],
    mobilePhone,
    homePhones = [],
    businessAddress,
    homeAddress,
    otherAddress,
    birthday,
    personalNotes,
    categories = [],
    microsoftId,
  } = contactData;

  // Validate required fields
  if (!displayName || displayName.trim() === '') {
    throw new Error('Display name is required');
  }

  const result = await db.query(
    `INSERT INTO contacts (
      display_name, given_name, surname, middle_name, title,
      company_name, department, job_title, email_address,
      business_phones, mobile_phone, home_phones,
      business_address, home_address, other_address,
      birthday, personal_notes, categories, microsoft_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    ) RETURNING *`,
    [
      displayName.trim(),
      givenName || null,
      surname || null,
      middleName || null,
      title || null,
      companyName || null,
      department || null,
      jobTitle || null,
      emailAddress || null,
      businessPhones,
      mobilePhone || null,
      homePhones,
      businessAddress ? JSON.stringify(businessAddress) : null,
      homeAddress ? JSON.stringify(homeAddress) : null,
      otherAddress ? JSON.stringify(otherAddress) : null,
      birthday || null,
      personalNotes || null,
      categories,
      microsoftId || null,
    ]
  );

  const newContact = result.rows[0];

  // Generate and persist embedding asynchronously (don't block response)
  setImmediate(async () => {
    try {
      const text = generateEmbeddingText(newContact);
      if (text && text.trim().length > 0) {
        await embeddingClient.generateAndPersistEmbedding(
          'contacts',
          newContact.id,
          text,
          { source: 'contact_profile' }
        );
        console.log(`[contactModel] ✓ Embedding generated for contact ${newContact.id}`);
      }
    } catch (err) {
      console.error(`[contactModel] Failed to generate embedding for contact ${newContact.id}:`, err.message);
    }
  });

  return newContact;
}

/**
 * Update an existing contact
 */
async function updateContact(id, contactData) {
  const {
    displayName,
    givenName,
    surname,
    middleName,
    title,
    companyName,
    department,
    jobTitle,
    emailAddress,
    businessPhones,
    mobilePhone,
    homePhones,
    businessAddress,
    homeAddress,
    otherAddress,
    birthday,
    personalNotes,
    categories,
    microsoftId,
    changeKey,
    isSynced,
    lastSyncedAt,
  } = contactData;

  const result = await db.query(
    `UPDATE contacts SET
      display_name = COALESCE($1, display_name),
      given_name = COALESCE($2, given_name),
      surname = COALESCE($3, surname),
      middle_name = COALESCE($4, middle_name),
      title = COALESCE($5, title),
      company_name = COALESCE($6, company_name),
      department = COALESCE($7, department),
      job_title = COALESCE($8, job_title),
      email_address = COALESCE($9, email_address),
      business_phones = COALESCE($10, business_phones),
      mobile_phone = COALESCE($11, mobile_phone),
      home_phones = COALESCE($12, home_phones),
      business_address = COALESCE($13, business_address),
      home_address = COALESCE($14, home_address),
      other_address = COALESCE($15, other_address),
      birthday = COALESCE($16, birthday),
      personal_notes = COALESCE($17, personal_notes),
      categories = COALESCE($18, categories),
      microsoft_id = COALESCE($19, microsoft_id),
      change_key = COALESCE($20, change_key),
      is_synced = COALESCE($21, is_synced),
      last_synced_at = COALESCE($22, last_synced_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $23
    RETURNING *`,
    [
      displayName,
      givenName,
      surname,
      middleName,
      title,
      companyName,
      department,
      jobTitle,
      emailAddress,
      businessPhones,
      mobilePhone,
      homePhones,
      businessAddress ? JSON.stringify(businessAddress) : null,
      homeAddress ? JSON.stringify(homeAddress) : null,
      otherAddress ? JSON.stringify(otherAddress) : null,
      birthday,
      personalNotes,
      categories,
      microsoftId,
      changeKey,
      isSynced,
      lastSyncedAt,
      id,
    ]
  );

  const updatedContact = result.rows[0] || null;

  // Regenerate embedding asynchronously if contact was updated
  if (updatedContact) {
    setImmediate(async () => {
      try {
        const text = generateEmbeddingText(updatedContact);
        if (text && text.trim().length > 0) {
          await embeddingClient.generateAndPersistEmbedding(
            'contacts',
            updatedContact.id,
            text,
            { source: 'contact_profile' }
          );
          console.log(`[contactModel] ✓ Embedding regenerated for contact ${updatedContact.id}`);
        }
      } catch (err) {
        console.error(`[contactModel] Failed to regenerate embedding for contact ${updatedContact.id}:`, err.message);
      }
    });
  }

  return updatedContact;
}

/**
 * Delete a contact
 */
async function deleteContact(id) {
  const result = await db.query(
    `DELETE FROM contacts WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Get contacts by category
 */
async function getContactsByCategory(category) {
  const result = await db.query(
    `SELECT * FROM contacts 
     WHERE $1 = ANY(categories)
     ORDER BY display_name ASC`,
    [category]
  );
  return result.rows;
}

/**
 * Get contacts by company
 */
async function getContactsByCompany(companyName) {
  const result = await db.query(
    `SELECT * FROM contacts 
     WHERE company_name ILIKE $1
     ORDER BY display_name ASC`,
    [`%${companyName}%`]
  );
  return result.rows;
}

/**
 * Search contacts using full-text search
 */
async function searchContacts(searchTerm) {
  const result = await db.query(
    `SELECT *,
      ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
     FROM contacts
     WHERE search_vector @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC, display_name ASC`,
    [searchTerm]
  );
  return result.rows;
}

/**
 * Bulk import contacts (for Microsoft 365 sync)
 */
async function bulkImportContacts(contacts) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const imported = [];
    const errors = [];
    
    for (const contact of contacts) {
      try {
        const result = await client.query(
          `INSERT INTO contacts (
            display_name, given_name, surname, middle_name, title,
            company_name, department, job_title, email_address,
            business_phones, mobile_phone, home_phones,
            business_address, home_address, other_address,
            birthday, personal_notes, categories,
            microsoft_id, change_key, is_synced, last_synced_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          )
          ON CONFLICT (microsoft_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            given_name = EXCLUDED.given_name,
            surname = EXCLUDED.surname,
            middle_name = EXCLUDED.middle_name,
            title = EXCLUDED.title,
            company_name = EXCLUDED.company_name,
            department = EXCLUDED.department,
            job_title = EXCLUDED.job_title,
            email_address = EXCLUDED.email_address,
            business_phones = EXCLUDED.business_phones,
            mobile_phone = EXCLUDED.mobile_phone,
            home_phones = EXCLUDED.home_phones,
            business_address = EXCLUDED.business_address,
            home_address = EXCLUDED.home_address,
            other_address = EXCLUDED.other_address,
            birthday = EXCLUDED.birthday,
            personal_notes = EXCLUDED.personal_notes,
            categories = EXCLUDED.categories,
            change_key = EXCLUDED.change_key,
            is_synced = EXCLUDED.is_synced,
            last_synced_at = EXCLUDED.last_synced_at,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
          [
            contact.displayName,
            contact.givenName || null,
            contact.surname || null,
            contact.middleName || null,
            contact.title || null,
            contact.companyName || null,
            contact.department || null,
            contact.jobTitle || null,
            contact.emailAddress || null,
            contact.businessPhones || [],
            contact.mobilePhone || null,
            contact.homePhones || [],
            contact.businessAddress ? JSON.stringify(contact.businessAddress) : null,
            contact.homeAddress ? JSON.stringify(contact.homeAddress) : null,
            contact.otherAddress ? JSON.stringify(contact.otherAddress) : null,
            contact.birthday || null,
            contact.personalNotes || null,
            contact.categories || [],
            contact.microsoftId,
            contact.changeKey || null,
            true, // is_synced
            new Date().toISOString(), // last_synced_at
          ]
        );
        
        imported.push(result.rows[0]);
      } catch (error) {
        errors.push({ contact, error: error.message });
      }
    }
    
    await client.query('COMMIT');
    
    return { imported, errors };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getContactsByCategory,
  getContactsByCompany,
  searchContacts,
  bulkImportContacts,
};
