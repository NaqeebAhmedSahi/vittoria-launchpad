// electron/models/calendarModel.cjs
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');

/**
 * Generate embedding text from calendar event data
 */
function generateEmbeddingText(eventData) {
  const parts = [];
  if (eventData.title) parts.push(eventData.title);
  if (eventData.description) parts.push(eventData.description.substring(0, 300));
  if (eventData.location) parts.push(`Location: ${eventData.location}`);
  if (eventData.organizer) parts.push(`Organizer: ${eventData.organizer}`);
  return parts.join(' - ');
}

/**
 * Get all calendar events
 */
async function getAllEvents() {
  const query = `
    SELECT * FROM calendar_events 
    ORDER BY event_date ASC
  `;
  const result = await db.query(query);
  return result.rows;
}

/**
 * Get events by date range
 */
async function getEventsByDateRange(startDate, endDate) {
  const query = `
    SELECT * FROM calendar_events 
    WHERE event_date BETWEEN $1 AND $2
    ORDER BY event_date ASC
  `;
  const result = await db.query(query, [startDate, endDate]);
  return result.rows;
}

/**
 * Get a single event by ID
 */
async function getEventById(id) {
  const query = 'SELECT * FROM calendar_events WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

/**
 * Create a new calendar event
 */
async function createEvent(eventData) {
  const {
    title,
    event_date,
    attendees = [],
    description,
    location
  } = eventData;

  const query = `
    INSERT INTO calendar_events (title, event_date, attendees, description, location)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const result = await db.query(query, [
    title,
    event_date,
    JSON.stringify(attendees),
    description,
    location
  ]);

  const newEvent = result.rows[0];

  // Generate and persist embedding asynchronously (don't block response)
  setImmediate(async () => {
    try {
      const text = generateEmbeddingText(newEvent);
      if (text && text.trim().length > 0) {
        await embeddingClient.generateAndPersistEmbedding(
          'calendar_events',
          newEvent.id,
          text,
          { source: 'event_details' }
        );
        console.log(`[calendarModel] ✓ Embedding generated for event ${newEvent.id}`);
      }
    } catch (err) {
      console.error(`[calendarModel] Failed to generate embedding for event ${newEvent.id}:`, err.message);
    }
  });

  return newEvent;
}

/**
 * Update an existing event
 */
async function updateEvent(id, eventData) {
  const {
    title,
    event_date,
    attendees,
    description,
    location
  } = eventData;

  const query = `
    UPDATE calendar_events 
    SET title = $1,
        event_date = $2,
        attendees = $3,
        description = $4,
        location = $5,
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
  `;

  const result = await db.query(query, [
    title,
    event_date,
    JSON.stringify(attendees),
    description,
    location,
    id
  ]);

  const updatedEvent = result.rows[0];

  // Regenerate embedding asynchronously if event was updated
  if (updatedEvent) {
    setImmediate(async () => {
      try {
        const text = generateEmbeddingText(updatedEvent);
        if (text && text.trim().length > 0) {
          await embeddingClient.generateAndPersistEmbedding(
            'calendar_events',
            updatedEvent.id,
            text,
            { source: 'event_details' }
          );
          console.log(`[calendarModel] ✓ Embedding regenerated for event ${updatedEvent.id}`);
        }
      } catch (err) {
        console.error(`[calendarModel] Failed to regenerate embedding for event ${updatedEvent.id}:`, err.message);
      }
    });
  }

  return updatedEvent;
}

/**
 * Delete an event
 */
async function deleteEvent(id) {
  const query = 'DELETE FROM calendar_events WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

module.exports = {
  getAllEvents,
  getEventsByDateRange,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
