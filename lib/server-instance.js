// This generates a unique ID every time the application (or this module) is loaded.
// When the server restarts, this value changes, invalidating all previous sessions.
export const SERVER_INSTANCE_ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
