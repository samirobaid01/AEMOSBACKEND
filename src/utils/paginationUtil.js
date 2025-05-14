/**
 * Utility functions for handling pagination in API responses
 */

/**
 * Apply pagination to a query result
 * @param {Array} data - The complete data array to paginate
 * @param {Object} options - Pagination options
 * @param {Number} options.page - Page number (1-based)
 * @param {Number} options.limit - Records per page
 * @returns {Object} Paginated data with metadata
 */
const paginate = (data, options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 20;
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {
    totalItems: data.length,
    totalPages: Math.ceil(data.length / limit),
    currentPage: page,
    pageSize: limit,
    data: data.slice(startIndex, endIndex)
  };
  
  return results;
};

module.exports = {
  paginate
}; 