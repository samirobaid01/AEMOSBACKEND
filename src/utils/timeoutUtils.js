const { TimeoutError, ERROR_CODES } = require('./TimeoutError');
const logger = require('./logger');
const timeoutMetrics = require('./timeoutMetrics');

function withTimeout(promise, timeoutMs, errorCode, context = {}) {
  if (timeoutMs <= 0) {
    return promise;
  }

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(
          `Operation timed out after ${timeoutMs}ms`,
          errorCode,
          {
            ...context,
            timeoutMs,
            duration: timeoutMs
          }
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

async function collectWithTimeout(collectionFn, timeoutMs, sourceType, sourceIds = []) {
  const startTime = Date.now();
  const timeoutDetails = {
    timedOut: false,
    duration: 0
  };

  try {
    const result = await withTimeout(
      collectionFn(),
      timeoutMs,
      ERROR_CODES.DATA_COLLECTION_TIMEOUT,
      {
        sourceType,
        sourceIds,
        operation: 'data_collection'
      }
    );

    timeoutDetails.duration = Date.now() - startTime;
    return { data: result, timeoutDetails };
  } catch (error) {
    timeoutDetails.duration = Date.now() - startTime;
    timeoutDetails.timedOut = error.isTimeout === true;

    if (error.isTimeout) {
      logger.warn(`Data collection timeout for ${sourceType}`, {
        sourceIds,
        timeoutMs,
        duration: timeoutDetails.duration,
        errorCode: error.code
      });
      timeoutMetrics.recordTimeout(error.code, timeoutDetails.duration);
      return { data: [], timeoutDetails };
    }

    throw error;
  }
}

module.exports = {
  withTimeout,
  collectWithTimeout
};
