/**
 * Time utility functions
 */

/**
 * Parses a duration string and converts it to milliseconds
 * @param {string} value - Duration string in format like "10s", "5m", "2h", "1d"
 * @returns {number} Duration in milliseconds, or 0 if invalid format
 * 
 * Supported units:
 * - s: seconds
 * - m: minutes  
 * - h: hours
 * - d: days
 * 
 * @example
 * parseDuration("10s") // returns 10000 (10 seconds in ms)
 * parseDuration("5m")  // returns 300000 (5 minutes in ms)
 * parseDuration("2h")  // returns 7200000 (2 hours in ms)
 * parseDuration("1d")  // returns 86400000 (1 day in ms)
 */
const parseDuration = (value) => {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  
  const num = parseInt(match[1], 10);
  const unit = match[2];
  
  const unitToMs = {
    s: 1000,        // seconds
    m: 60000,       // minutes
    h: 3600000,     // hours
    d: 86400000,    // days
  };
  
  return num * unitToMs[unit];
};

module.exports = {
  parseDuration,
}; 