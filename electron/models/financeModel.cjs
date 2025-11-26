// electron/models/financeModel.cjs
const db = require('../db/pgConnection.cjs');

const FinanceModel = {
  /**
   * List all finance transactions with optional filters
   * @param {Object} filters - { firm_id, mandate_id, candidate_id, transaction_type, payment_status, start_date, end_date }
   * @returns {Promise<Array>}
   */
  async list(filters = {}) {
    let query = `
      SELECT 
        ft.*,
        p.first_name || ' ' || p.last_name as creator_name,
        f.name as firm_name,
        m.name as mandate_name,
        c.name as candidate_name
      FROM finance_transactions ft
      LEFT JOIN people p ON ft.created_by = p.id
      LEFT JOIN firms f ON ft.firm_id = f.id
      LEFT JOIN mandates m ON ft.mandate_id = m.id
      LEFT JOIN candidates c ON ft.candidate_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.firm_id) {
      query += ` AND ft.firm_id = $${paramCount++}`;
      params.push(filters.firm_id);
    }

    if (filters.mandate_id) {
      query += ` AND ft.mandate_id = $${paramCount++}`;
      params.push(filters.mandate_id);
    }

    if (filters.candidate_id) {
      query += ` AND ft.candidate_id = $${paramCount++}`;
      params.push(filters.candidate_id);
    }

    if (filters.transaction_type) {
      query += ` AND ft.transaction_type = $${paramCount++}`;
      params.push(filters.transaction_type);
    }

    if (filters.payment_status) {
      query += ` AND ft.payment_status = $${paramCount++}`;
      params.push(filters.payment_status);
    }

    if (filters.start_date) {
      query += ` AND ft.transaction_date >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND ft.transaction_date <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    if (filters.category) {
      query += ` AND ft.category = $${paramCount++}`;
      params.push(filters.category);
    }

    query += ' ORDER BY ft.transaction_date DESC, ft.created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get transaction by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const result = await db.query(
      `SELECT 
        ft.*,
        p.first_name || ' ' || p.last_name as creator_name,
        f.name as firm_name,
        m.name as mandate_name,
        c.name as candidate_name
      FROM finance_transactions ft
      LEFT JOIN people p ON ft.created_by = p.id
      LEFT JOIN firms f ON ft.firm_id = f.id
      LEFT JOIN mandates m ON ft.mandate_id = m.id
      LEFT JOIN candidates c ON ft.candidate_id = c.id
      WHERE ft.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new transaction
   * @param {Object} data
   * @returns {Promise<number>} - New transaction ID
   */
  async create(data) {
    const result = await db.query(
      `INSERT INTO finance_transactions (
        transaction_type, category, amount, currency, description,
        transaction_date, firm_id, mandate_id, candidate_id,
        invoice_number, payment_status, payment_method, payment_date,
        tax_amount, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        data.transaction_type,
        data.category || null,
        data.amount,
        data.currency || 'GBP',
        data.description || null,
        data.transaction_date,
        data.firm_id || null,
        data.mandate_id || null,
        data.candidate_id || null,
        data.invoice_number || null,
        data.payment_status || 'Pending',
        data.payment_method || null,
        data.payment_date || null,
        data.tax_amount || null,
        data.notes || null,
        data.created_by || null
      ]
    );
    return result.rows[0].id;
  },

  /**
   * Update transaction
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.transaction_type !== undefined) {
      fields.push(`transaction_type = $${paramCount++}`);
      values.push(data.transaction_type);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramCount++}`);
      values.push(data.category);
    }
    if (data.amount !== undefined) {
      fields.push(`amount = $${paramCount++}`);
      values.push(data.amount);
    }
    if (data.currency !== undefined) {
      fields.push(`currency = $${paramCount++}`);
      values.push(data.currency);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.transaction_date !== undefined) {
      fields.push(`transaction_date = $${paramCount++}`);
      values.push(data.transaction_date);
    }
    if (data.payment_status !== undefined) {
      fields.push(`payment_status = $${paramCount++}`);
      values.push(data.payment_status);
    }
    if (data.payment_method !== undefined) {
      fields.push(`payment_method = $${paramCount++}`);
      values.push(data.payment_method);
    }
    if (data.payment_date !== undefined) {
      fields.push(`payment_date = $${paramCount++}`);
      values.push(data.payment_date);
    }
    if (data.tax_amount !== undefined) {
      fields.push(`tax_amount = $${paramCount++}`);
      values.push(data.tax_amount);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }
    if (data.invoice_number !== undefined) {
      fields.push(`invoice_number = $${paramCount++}`);
      values.push(data.invoice_number);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.query(
      `UPDATE finance_transactions SET ${fields.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  },

  /**
   * Delete transaction
   * @param {number} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    await db.query('DELETE FROM finance_transactions WHERE id = $1', [id]);
  },

  /**
   * Get financial summary
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getSummary(filters = {}) {
    let query = `
      SELECT 
        transaction_type,
        payment_status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        currency
      FROM finance_transactions
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.firm_id) {
      query += ` AND firm_id = $${paramCount++}`;
      params.push(filters.firm_id);
    }

    if (filters.start_date) {
      query += ` AND transaction_date >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND transaction_date <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    query += ' GROUP BY transaction_type, payment_status, currency';

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get transaction categories
   * @returns {Promise<Array<string>>}
   */
  async getCategories() {
    const result = await db.query(
      'SELECT DISTINCT category FROM finance_transactions WHERE category IS NOT NULL ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }
};

module.exports = FinanceModel;
