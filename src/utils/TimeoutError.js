class TimeoutError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'TimeoutError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isTimeout = true;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      isTimeout: this.isTimeout
    };
  }
}

const ERROR_CODES = {
  DATA_COLLECTION_TIMEOUT: 'DATA_COLLECTION_TIMEOUT',
  RULE_CHAIN_TIMEOUT: 'RULE_CHAIN_TIMEOUT',
  WORKER_TIMEOUT: 'WORKER_TIMEOUT',
  EXTERNAL_ACTION_TIMEOUT: 'EXTERNAL_ACTION_TIMEOUT'
};

module.exports = {
  TimeoutError,
  ERROR_CODES
};
