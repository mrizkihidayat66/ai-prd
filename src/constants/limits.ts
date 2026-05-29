/**
 * Application-wide limits and constraints
 */

// Project limits
export const MAX_PROJECT_NAME_LENGTH = 200;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 2000;
export const MAX_PROJECT_TAGS = 10;
export const MAX_TAG_LENGTH = 50;

// Conversation limits
export const MAX_MESSAGE_LENGTH = 50000;
export const MAX_CONVERSATION_HISTORY = 100;

// Plan limits
export const MAX_PLAN_SNAPSHOTS = 20;
export const MAX_PRD_LENGTH = 100000;

// Settings limits
export const MIN_TEMPERATURE = 0.0;
export const MAX_TEMPERATURE = 2.0;
export const DEFAULT_TEMPERATURE = 0.7;

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute
export const RATE_LIMIT_MAX_CHAT_REQUESTS = 20; // 20 chat requests per minute

// Timeouts
export const LLM_REQUEST_TIMEOUT_MS = 120 * 1000; // 2 minutes
export const API_REQUEST_TIMEOUT_MS = 30 * 1000; // 30 seconds

// Validation
export const MIN_API_KEY_LENGTH = 10;
export const MAX_API_KEY_LENGTH = 500;
export const MAX_BASE_URL_LENGTH = 500;
