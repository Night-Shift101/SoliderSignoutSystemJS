/**
 * @fileoverview Standardized Error Handler for SignOuts System
 * 
 * This module provides a comprehensive error handling system that implements
 * consistent error handling patterns across the entire codebase. It includes
 * standardized response formats, error categorization, logging capabilities,
 * and integration utilities for both Express.js and general JavaScript functions.
 * 
 * @author Gavin Fox
 * @version 1.0.0
 * @since 2025-07-19
 */

/**
 * Standard response structure for all operations in the system
 * 
 * @typedef {Object} StandardResponse
 * @property {boolean} success - Whether the operation succeeded
 * @property {string|null} error - Error message if operation failed, null if succeeded
 * @property {*} [data] - Response data if operation succeeded, undefined for failures
 * @property {string} [message] - Optional success message for successful operations
 * @property {*} [details] - Additional error details (only in development mode)
 */

/**
 * Error information object used internally for logging
 * 
 * @typedef {Object} ErrorInfo
 * @property {string} message - Error message
 * @property {string} category - Error category from ErrorCategory enum
 * @property {string} severity - Error severity from ErrorSeverity enum
 * @property {*} [details] - Additional error details
 * @property {Error} [originalError] - Original error object if available
 * @property {string} timestamp - ISO timestamp when error occurred
 * @property {string} context - Context where error occurred
 * @property {string} [stack] - Error stack trace
 * @property {string} [url] - Request URL (for Express errors)
 * @property {string} [method] - HTTP method (for Express errors)
 * @property {string} [ip] - Client IP address (for Express errors)
 * @property {string} [userAgent] - Client user agent (for Express errors)
 */

/**
 * Configuration options for ErrorHandler constructor
 * 
 * @typedef {Object} ErrorHandlerOptions
 * @property {boolean} [enableLogging=true] - Whether to enable error logging
 * @property {boolean} [enableConsoleOutput=true] - Whether to output errors to console
 * @property {string|null} [logFilePath=null] - Path to log file (not implemented yet)
 * @property {string} [context='Unknown'] - Context name for this error handler instance
 */

/**
 * Options for the failure method to provide additional error context
 * 
 * @typedef {Object} FailureOptions
 * @property {string} [category='system'] - Error category from ErrorCategory
 * @property {string} [severity='medium'] - Error severity from ErrorSeverity
 * @property {*} [details=null] - Additional error details
 * @property {Error} [originalError=null] - Original error object
 */

/**
 * Options for function wrapping methods
 * 
 * @typedef {Object} WrapperOptions
 * @property {string} [category='system'] - Error category to use if function throws
 * @property {string} [severity='medium'] - Error severity to use if function throws
 * @property {string} [message='Operation failed'] - Error message to use if function throws
 */

/**
 * Enumeration of error severity levels for consistent error prioritization
 * 
 * @readonly
 * @enum {string}
 */
const ErrorSeverity = {
    /** Minor issues that don't affect core functionality */
    LOW: 'low',
    /** Issues that affect some functionality but user can continue */
    MEDIUM: 'medium',
    /** Significant impact where user actions may fail */
    HIGH: 'high',
    /** System-level issues that may require immediate attention */
    CRITICAL: 'critical'
};

/**
 * Enumeration of error categories for better organization and handling
 * 
 * @readonly
 * @enum {string}
 */
const ErrorCategory = {
    /** Input validation and data format errors */
    VALIDATION: 'validation',
    /** Authentication and identity verification errors */
    AUTHENTICATION: 'authentication',
    /** Authorization and permission-related errors */
    AUTHORIZATION: 'authorization',
    /** Database operation and query errors */
    DATABASE: 'database',
    /** Network connectivity and communication errors */
    NETWORK: 'network',
    /** System-level and infrastructure errors */
    SYSTEM: 'system',
    /** Business logic and rule violation errors */
    BUSINESS: 'business',
    /** Third-party service and external API errors */
    EXTERNAL: 'external'
};

/**
 * Comprehensive Error Handler Class
 * 
 * Provides standardized error handling, logging, and response formatting
 * for the entire SignOuts system. This class ensures consistent error
 * responses and centralized error management across all application layers.
 * 
 * @class ErrorHandler
 * @example
 * // Create a global error handler
 * const errorHandler = new ErrorHandler({ context: 'UserService' });
 * 
 * // Handle success
 * const result = errorHandler.success({ userId: 123 }, 'User created successfully');
 * 
 * // Handle failure
 * const error = errorHandler.failure('User not found', {
 *   category: ErrorCategory.BUSINESS,
 *   severity: ErrorSeverity.MEDIUM
 * });
 */
class ErrorHandler {
    /**
     * Creates an instance of ErrorHandler
     * 
     * @param {ErrorHandlerOptions} [options={}] - Configuration options for the error handler
     * @param {boolean} [options.enableLogging=true] - Whether to enable error logging
     * @param {boolean} [options.enableConsoleOutput=true] - Whether to output errors to console
     * @param {string|null} [options.logFilePath=null] - Path to log file for persistent logging
     * @param {string} [options.context='Unknown'] - Context identifier for this handler instance
     * 
     * @memberof ErrorHandler
     */
    constructor(options = {}) {
        this.enableLogging = options.enableLogging ?? true;
        this.enableConsoleOutput = options.enableConsoleOutput ?? true;
        this.logFilePath = options.logFilePath || null;
        this.context = options.context || 'Unknown';
    }

    /**
     * Creates a standardized success response
     * 
     * @param {*} [data=null] - The response data to include
     * @param {string} [message=null] - Optional success message
     * @returns {StandardResponse} Standardized success response object
     * 
     * @example
     * const result = errorHandler.success({ users: [...] }, 'Users retrieved successfully');
     * // Returns: { success: true, error: null, data: { users: [...] }, message: '...' }
     * 
     * @memberof ErrorHandler
     */
    success(data = null, message = null) {
        const response = {
            success: true,
            error: null,
            data
        };

        if (message) {
            response.message = message;
        }

        return response;
    }

    /**
     * Creates a standardized failure response with comprehensive error handling
     * 
     * @param {string} [message='Unknown error'] - Human-readable error message
     * @param {FailureOptions} [options={}] - Additional error configuration options
     * @param {string} [options.category=ErrorCategory.SYSTEM] - Error category for classification
     * @param {string} [options.severity=ErrorSeverity.MEDIUM] - Error severity level
     * @param {*} [options.details=null] - Additional error details for debugging
     * @param {Error} [options.originalError=null] - Original error object if available
     * @returns {StandardResponse} Standardized failure response object
     * 
     * @example
     * const error = errorHandler.failure('Database connection failed', {
     *   category: ErrorCategory.DATABASE,
     *   severity: ErrorSeverity.HIGH,
     *   originalError: dbError
     * });
     * 
     * @memberof ErrorHandler
     */
    failure(message = 'Unknown error', options = {}) {
        const {
            category = ErrorCategory.SYSTEM,
            severity = ErrorSeverity.MEDIUM,
            details = null,
            originalError = null
        } = options;

        const errorResponse = {
            success: false,
            error: message,
            data: null
        };

        // Log the error if logging is enabled
        if (this.enableLogging) {
            this.logError({
                message,
                category,
                severity,
                details,
                originalError,
                timestamp: new Date().toISOString(),
                context: this.context
            });
        }

        // Add details to response in development mode
        if (process.env.NODE_ENV === 'development' && details) {
            errorResponse.details = details;
        }

        return errorResponse;
    }

    /**
     * Handles validation errors from express-validator or custom validation
     * 
     * @param {Array|Object|string} errors - Validation errors in various formats
     * @returns {StandardResponse} Standardized validation error response
     * 
     * @example
     * // Array of express-validator errors
     * const validationResult = validationResult(req);
     * if (!validationResult.isEmpty()) {
     *   return errorHandler.validationError(validationResult.array());
     * }
     * 
     * @memberof ErrorHandler
     */
    validationError(errors) {
        let message;
        
        if (Array.isArray(errors)) {
            message = errors.map(err => err.msg || err.message || err).join(', ');
        } else if (typeof errors === 'object' && errors.message) {
            message = errors.message;
        } else {
            message = 'Validation failed';
        }

        return this.failure(message, {
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            details: errors
        });
    }

    /**
     * Handles authentication-related errors
     * 
     * @param {string} [message='Authentication failed'] - Custom authentication error message
     * @returns {StandardResponse} Standardized authentication error response
     * 
     * @example
     * const authError = errorHandler.authError('Invalid credentials provided');
     * 
     * @memberof ErrorHandler
     */
    authError(message = 'Authentication failed') {
        return this.failure(message, {
            category: ErrorCategory.AUTHENTICATION,
            severity: ErrorSeverity.HIGH
        });
    }

    /**
     * Handles authorization and permission-related errors
     * 
     * @param {string} [message='Permission denied'] - Custom permission error message
     * @returns {StandardResponse} Standardized authorization error response
     * 
     * @example
     * const permError = errorHandler.permissionError('Insufficient privileges to access this resource');
     * 
     * @memberof ErrorHandler
     */
    permissionError(message = 'Permission denied') {
        return this.failure(message, {
            category: ErrorCategory.AUTHORIZATION,
            severity: ErrorSeverity.MEDIUM
        });
    }

    /**
     * Handles database operation errors with detailed logging
     * 
     * @param {Error} error - Database error object
     * @param {string} [operation='Database operation'] - Description of the failed operation
     * @returns {StandardResponse} Standardized database error response
     * 
     * @example
     * try {
     *   await db.query('SELECT * FROM users');
     * } catch (dbError) {
     *   return errorHandler.databaseError(dbError, 'User retrieval query');
     * }
     * 
     * @memberof ErrorHandler
     */
    databaseError(error, operation = 'Database operation') {
        const message = `${operation} failed`;
        
        return this.failure(message, {
            category: ErrorCategory.DATABASE,
            severity: ErrorSeverity.HIGH,
            originalError: error,
            details: {
                operation,
                errorCode: error.code,
                sqlState: error.errno
            }
        });
    }

    /**
     * Handles network and connectivity errors
     * 
     * @param {Error} error - Network error object
     * @param {string} [endpoint='Unknown endpoint'] - Endpoint or service that failed
     * @returns {StandardResponse} Standardized network error response
     * 
     * @example
     * try {
     *   await fetch('/api/external-service');
     * } catch (networkError) {
     *   return errorHandler.networkError(networkError, '/api/external-service');
     * }
     * 
     * @memberof ErrorHandler
     */
    networkError(error, endpoint = 'Unknown endpoint') {
        const message = 'Network connection failed';
        
        return this.failure(message, {
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            originalError: error,
            details: { endpoint }
        });
    }

    /**
     * Wraps async functions with standardized error handling
     * 
     * This method provides a higher-order function that automatically catches
     * exceptions and converts them to standardized error responses. If the
     * wrapped function already returns a StandardResponse, it passes through unchanged.
     * 
     * @param {Function} asyncFn - Async function to wrap with error handling
     * @param {WrapperOptions} [options={}] - Error handling options for failures
     * @param {string} [options.category=ErrorCategory.SYSTEM] - Error category for exceptions
     * @param {string} [options.severity=ErrorSeverity.MEDIUM] - Error severity for exceptions
     * @param {string} [options.message='Operation failed'] - Error message for exceptions
     * @returns {Function} Wrapped function that returns StandardResponse
     * 
     * @example
     * const safeUserFetch = errorHandler.wrapAsync(async (userId) => {
     *   const user = await database.getUser(userId);
     *   return user;
     * }, { message: 'Failed to fetch user', category: ErrorCategory.DATABASE });
     * 
     * const result = await safeUserFetch(123);
     * if (!result.success) {
     *   console.error(result.error);
     * }
     * 
     * @memberof ErrorHandler
     */
    wrapAsync(asyncFn, options = {}) {
        return async (...args) => {
            try {
                const result = await asyncFn(...args);
                
                // If function already returns a StandardResponse, return as-is
                if (result && typeof result === 'object' && 'success' in result) {
                    return result;
                }
                
                // Otherwise, wrap in success response
                return this.success(result);
            } catch (error) {
                const {
                    category = ErrorCategory.SYSTEM,
                    severity = ErrorSeverity.MEDIUM,
                    message = 'Operation failed'
                } = options;

                return this.failure(message, {
                    category,
                    severity,
                    originalError: error
                });
            }
        };
    }

    /**
     * Wraps callback-based functions with standardized error handling
     * 
     * This method provides a wrapper for traditional Node.js callback-style functions,
     * converting them to use standardized error responses. The callback signature
     * follows the standard (error, result) pattern.
     * 
     * @param {Function} callbackFn - Function that uses Node.js-style callbacks
     * @param {WrapperOptions} [options={}] - Error handling options for failures
     * @param {string} [options.category=ErrorCategory.SYSTEM] - Error category for exceptions
     * @param {string} [options.severity=ErrorSeverity.MEDIUM] - Error severity for exceptions
     * @param {string} [options.message='Operation failed'] - Error message for exceptions
     * @returns {Function} Wrapped function that returns StandardResponse via callback
     * 
     * @example
     * const safeDbQuery = errorHandler.wrapCallback(db.query.bind(db), {
     *   message: 'Database query failed',
     *   category: ErrorCategory.DATABASE
     * });
     * 
     * safeDbQuery('SELECT * FROM users', (err, result) => {
     *   if (!result.success) {
     *     console.error(result.error);
     *     return;
     *   }
     *   console.log(result.data);
     * });
     * 
     * @memberof ErrorHandler
     */
    wrapCallback(callbackFn, options = {}) {
        return (...args) => {
            // Extract callback from arguments
            const callback = args[args.length - 1];
            const fnArgs = args.slice(0, -1);

            const wrappedCallback = (error, result) => {
                if (error) {
                    const {
                        category = ErrorCategory.SYSTEM,
                        severity = ErrorSeverity.MEDIUM,
                        message = 'Operation failed'
                    } = options;

                    const errorResponse = this.failure(message, {
                        category,
                        severity,
                        originalError: error
                    });
                    
                    return callback(null, errorResponse);
                }

                // If result already is a StandardResponse, return as-is
                if (result && typeof result === 'object' && 'success' in result) {
                    return callback(null, result);
                }

                // Otherwise, wrap in success response
                return callback(null, this.success(result));
            };

            callbackFn(...fnArgs, wrappedCallback);
        };
    }

    /**
     * Express.js middleware for centralized error handling
     * 
     * This middleware provides centralized error handling for Express.js applications.
     * It automatically maps different error types to appropriate HTTP status codes
     * and standardized error responses. Should be used as the last middleware in
     * the Express middleware chain.
     * 
     * @param {Error} err - Express error object
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * 
     * @example
     * // In server.js or app.js
     * const { globalErrorHandler } = require('./utils/error-handler');
     * 
     * // ... other middleware and routes
     * 
     * // Error handling middleware (must be last)
     * app.use(globalErrorHandler.expressErrorHandler.bind(globalErrorHandler));
     * 
     * @memberof ErrorHandler
     */
    expressErrorHandler(err, req, res, next) {
        let statusCode = 500;
        let errorResponse;

        // Handle different types of errors
        if (err.name === 'ValidationError') {
            statusCode = 400;
            errorResponse = this.validationError(err.errors || err.message);
        } else if (err.name === 'UnauthorizedError' || err.status === 401) {
            statusCode = 401;
            errorResponse = this.authError(err.message);
        } else if (err.name === 'ForbiddenError' || err.status === 403) {
            statusCode = 403;
            errorResponse = this.permissionError(err.message);
        } else if (err.name === 'NotFoundError' || err.status === 404) {
            statusCode = 404;
            errorResponse = this.failure('Resource not found');
        } else {
            // Generic server error
            errorResponse = this.failure('Internal server error', {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.CRITICAL,
                originalError: err
            });
        }

        // Log the error with Express-specific context
        if (this.enableLogging) {
            this.logError({
                message: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                context: `Express:${this.context}`
            });
        }

        res.status(statusCode).json(errorResponse);
    }

    /**
     * Logs error information to various outputs
     * 
     * This private method handles the actual logging of error information.
     * It supports console output and is designed to be extended with file
     * logging, database logging, and external service integration.
     * 
     * @param {ErrorInfo} errorInfo - Comprehensive error information object
     * @param {string} errorInfo.message - Error message
     * @param {string} errorInfo.category - Error category
     * @param {string} errorInfo.severity - Error severity
     * @param {string} errorInfo.timestamp - ISO timestamp
     * @param {string} errorInfo.context - Context where error occurred
     * @param {*} [errorInfo.details] - Additional error details
     * @param {Error} [errorInfo.originalError] - Original error object
     * @param {string} [errorInfo.stack] - Error stack trace
     * @param {string} [errorInfo.url] - Request URL (for Express errors)
     * @param {string} [errorInfo.method] - HTTP method (for Express errors)
     * @param {string} [errorInfo.ip] - Client IP address
     * @param {string} [errorInfo.userAgent] - Client user agent
     * 
     * @private
     * @memberof ErrorHandler
     */
    logError(errorInfo) {
        if (this.enableConsoleOutput) {
            console.error('🚨 Error occurred:', {
                timestamp: errorInfo.timestamp,
                context: errorInfo.context,
                message: errorInfo.message,
                category: errorInfo.category,
                severity: errorInfo.severity,
                stack: errorInfo.originalError?.stack,
                details: errorInfo.details
            });
        }
    }

    /**
     * Creates a context-specific error handler instance
     * 
     * This factory method creates a new ErrorHandler instance with a specific
     * context identifier, while inheriting configuration from the parent handler.
     * Useful for creating module-specific or component-specific error handlers.
     * 
     * @param {string} context - Context name for the new handler (e.g., 'UserManager', 'AuthController')
     * @param {ErrorHandlerOptions} [options={}] - Additional options to override parent settings
     * @param {boolean} [options.enableLogging] - Override logging setting
     * @param {boolean} [options.enableConsoleOutput] - Override console output setting
     * @param {string|null} [options.logFilePath] - Override log file path
     * @returns {ErrorHandler} New error handler instance with specified context
     * 
     * @example
     * const userHandler = globalErrorHandler.createContextHandler('UserManager');
     * const authHandler = globalErrorHandler.createContextHandler('AuthController', {
     *   enableConsoleOutput: false
     * });
     * 
     * @memberof ErrorHandler
     */
    createContextHandler(context, options = {}) {
        return new ErrorHandler({
            ...options,
            enableLogging: this.enableLogging,
            enableConsoleOutput: this.enableConsoleOutput,
            logFilePath: this.logFilePath,
            context
        });
    }
}

/**
 * Global error handler instance for system-wide use
 * 
 * This singleton instance provides a default error handler that can be used
 * throughout the application without needing to create individual instances.
 * It's configured with sensible defaults and production-appropriate settings.
 * 
 * @type {ErrorHandler}
 * @global
 * 
 * @example
 * const { globalErrorHandler } = require('./utils/error-handler');
 * 
 * // Use directly for simple cases
 * const result = globalErrorHandler.success(data);
 * 
 * // Or create context-specific handlers
 * const userHandler = globalErrorHandler.createContextHandler('UserService');
 */
const globalErrorHandler = new ErrorHandler({
    context: 'Global',
    enableLogging: true,
    enableConsoleOutput: process.env.NODE_ENV !== 'production'
});

/**
 * Module exports for the Error Handler system
 * 
 * @module ErrorHandler
 * @exports {Object} - Object containing ErrorHandler class and utilities
 * @exports {ErrorHandler} ErrorHandler - Main ErrorHandler class
 * @exports {Object} ErrorSeverity - Enumeration of error severity levels
 * @exports {Object} ErrorCategory - Enumeration of error categories
 * @exports {ErrorHandler} globalErrorHandler - Pre-configured global instance
 * 
 * @example
 * // Import specific components
 * const { ErrorHandler, ErrorSeverity, ErrorCategory } = require('./utils/error-handler');
 * 
 * // Import global instance
 * const { globalErrorHandler } = require('./utils/error-handler');
 * 
 * // Import everything
 * const ErrorHandling = require('./utils/error-handler');
 */
module.exports = {
    ErrorHandler,
    ErrorSeverity,
    ErrorCategory,
    globalErrorHandler
};
