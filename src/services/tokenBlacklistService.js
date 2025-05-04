// In-memory token blacklist
// In a production environment, this should be replaced with Redis or another persistent store
const blacklistedTokens = new Set();

// Add a token to the blacklist
const blacklistToken = (token, expiryTime) => {
  blacklistedTokens.add(token);
  
  // Set a timeout to remove the token from the blacklist after it expires
  // This helps prevent the blacklist from growing indefinitely
  const tokenExpiryMs = expiryTime * 1000;
  setTimeout(() => {
    blacklistedTokens.delete(token);
  }, tokenExpiryMs);
};

// Check if a token is blacklisted
const isTokenBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted
}; 