// electron/controllers/calendarController.cjs
const { ipcMain } = require('electron');
const calendarModel = require('../models/calendarModel.cjs');

function setupCalendarHandlers() {
  // Get all events
  ipcMain.handle('calendar:getAll', async (event) => {
    try {
      const events = await calendarModel.getAllEvents();
      return { success: true, events };
    } catch (error) {
      console.error('[calendarController] Error getting events:', error);
      return { success: false, error: error.message };
    }
  });

  // Get events by date range
  ipcMain.handle('calendar:getByDateRange', async (event, { startDate, endDate }) => {
    try {
      const events = await calendarModel.getEventsByDateRange(startDate, endDate);
      return { success: true, events };
    } catch (error) {
      console.error('[calendarController] Error getting events by date range:', error);
      return { success: false, error: error.message };
    }
  });

  // Get event by ID
  ipcMain.handle('calendar:getById', async (event, id) => {
    try {
      const calendarEvent = await calendarModel.getEventById(id);
      return { success: true, event: calendarEvent };
    } catch (error) {
      console.error('[calendarController] Error getting event:', error);
      return { success: false, error: error.message };
    }
  });

  // Create event
  ipcMain.handle('calendar:create', async (event, eventData) => {
    try {
      const calendarEvent = await calendarModel.createEvent(eventData);
      return { success: true, event: calendarEvent };
    } catch (error) {
      console.error('[calendarController] Error creating event:', error);
      return { success: false, error: error.message };
    }
  });

  // Update event
  ipcMain.handle('calendar:update', async (event, { id, eventData }) => {
    try {
      const calendarEvent = await calendarModel.updateEvent(id, eventData);
      return { success: true, event: calendarEvent };
    } catch (error) {
      console.error('[calendarController] Error updating event:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete event
  ipcMain.handle('calendar:delete', async (event, id) => {
    try {
      const calendarEvent = await calendarModel.deleteEvent(id);
      return { success: true, event: calendarEvent };
    } catch (error) {
      console.error('[calendarController] Error deleting event:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupCalendarHandlers };
