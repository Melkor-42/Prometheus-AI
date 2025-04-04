/**
 * User identity management for the P2P chat application
 */

// Local storage keys
const STORAGE_KEY_DISPLAY_NAME = 'prometheus-chat-display-name';
const STORAGE_KEY_USER_ID = 'prometheus-chat-user-id';

/**
 * Generates a random user ID
 * @returns {string} Random ID
 */
function generateRandomId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * UserIdentity - Manages the local user's identity
 */
export class UserIdentity {
  constructor() {
    // Try to load the user's identity from local storage
    this.loadIdentity();
  }

  /**
   * Load the user's identity from local storage
   * @private
   */
  loadIdentity() {
    try {
      // Get the user ID from local storage, or generate a new one
      this.userId = localStorage.getItem(STORAGE_KEY_USER_ID);
      if (!this.userId) {
        this.userId = generateRandomId();
        localStorage.setItem(STORAGE_KEY_USER_ID, this.userId);
      }

      // Get the display name from local storage, or default to the user ID
      this.displayName = localStorage.getItem(STORAGE_KEY_DISPLAY_NAME) || this.userId;
    } catch (err) {
      console.error('Error loading user identity:', err);
      // Fallback for when localStorage is not available
      this.userId = generateRandomId();
      this.displayName = this.userId;
    }
  }

  /**
   * Set the user's display name
   * @param {string} name - New display name
   */
  setDisplayName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Display name cannot be empty');
    }
    
    this.displayName = name.trim();
    
    try {
      localStorage.setItem(STORAGE_KEY_DISPLAY_NAME, this.displayName);
    } catch (err) {
      console.error('Error saving display name:', err);
    }
    
    // Notify listeners that the display name has changed
    if (this.onDisplayNameChange) {
      this.onDisplayNameChange(this.displayName);
    }
  }

  /**
   * Get the user's display name
   * @returns {string} Display name
   */
  getDisplayName() {
    return this.displayName;
  }

  /**
   * Get the user's ID
   * @returns {string} User ID
   */
  getUserId() {
    return this.userId;
  }

  /**
   * Register a callback for when the display name changes
   * @param {Function} callback - Called when the display name changes
   */
  setOnDisplayNameChange(callback) {
    this.onDisplayNameChange = callback;
  }

  /**
   * Get the user's full identity
   * @returns {Object} User identity with id and displayName
   */
  getIdentity() {
    return {
      id: this.userId,
      displayName: this.displayName
    };
  }
}

// Export a singleton instance
export const userIdentity = new UserIdentity(); 