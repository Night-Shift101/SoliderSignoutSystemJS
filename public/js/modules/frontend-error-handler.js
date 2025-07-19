/**
 * @fileoverview Frontend Error Handler for SignOuts System
 * 
 * This module provides a comprehensive client-side error handling system that implements
 * consistent error handling patterns across the frontend JavaScript modules. It includes
 * standardized response formats, error categorization, user notification integration,
 * and utilities for handling API responses and frontend operations.
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
 * @property {string} [url] - Request URL (for network errors)
 * @property {number} [status] - HTTP status code (for API errors)
 */

/**
 * Configuration options for FrontendErrorHandler constructor
 * 
 * @typedef {Object} FrontendErrorHandlerOptions
 * @property {boolean} [enableLogging=true] - Whether to enable error logging
 * @property {boolean} [enableConsoleOutput=true] - Whether to output errors to console
 * @property {Object} [notificationManager=null] - Notification manager instance for user alerts
 * @property {string} [context='Unknown'] - Context name for this error handler instance
 * @property {boolean} [showUserNotifications=true] - Whether to show notifications to users
 */

/**
 * Options for the failure method to provide additional error context
 * 
 * @typedef {Object} FailureOptions
 * @property {string} [category='system'] - Error category from ErrorCategory
 * @property {string} [severity='medium'] - Error severity from ErrorSeverity
 * @property {*} [details=null] - Additional error details
 * @property {Error} [originalError=null] - Original error object
 * @property {boolean} [showNotification=true] - Whether to show user notification
 * @property {string} [notificationType='error'] - Notification type (error, warning, info)
 */

/**
 * Options for function wrapping methods
 * 
 * @typedef {Object} WrapperOptions
 * @property {string} [category='system'] - Error category to use if function throws
 * @property {string} [severity='medium'] - Error severity to use if function throws
 * @property {string} [message='Operation failed'] - Error message to use if function throws
 * @property {boolean} [showNotification=true] - Whether to show user notification on error
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
    /** Network connectivity and API communication errors */
    NETWORK: 'network',
    /** Client-side system and browser errors */
    SYSTEM: 'system',
    /** Business logic and rule violation errors */
    BUSINESS: 'business',
    /** User interface and interaction errors */
    UI: 'ui',
    /** Data processing and manipulation errors */
    DATA: 'data'
};

/**
 * Frontend Error Handler Class
 * 
 * Provides standardized error handling, logging, and user notification
 * for the frontend SignOuts system. This class ensures consistent error
 * responses and centralized error management across all frontend modules.
 * 
 * @class FrontendErrorHandler
 * @example
 * // Create a module-specific error handler
 * const errorHandler = new FrontendErrorHandler({ 
 *   context: 'UserManager',
 *   notificationManager: app.notificationManager
 * });
 * 
 * // Handle success with user notification
 * const result = errorHandler.success({ userId: 123 }, 'User created successfully');
 * 
 * // Handle failure with automatic user notification
 * const error = errorHandler.failure('User not found', {
 *   category: ErrorCategory.BUSINESS,
 *   severity: ErrorSeverity.MEDIUM
 * });
 */
class FrontendErrorHandler {
    /**
     * Creates an instance of FrontendErrorHandler
     * 
     * @param {FrontendErrorHandlerOptions} [options={}] - Configuration options
     * @param {boolean} [options.enableLogging=true] - Whether to enable error logging
     * @param {boolean} [options.enableConsoleOutput=true] - Whether to output errors to console
     * @param {Object} [options.notificationManager=null] - Notification manager for user alerts
     * @param {string} [options.context='Unknown'] - Context identifier for this handler
     * @param {boolean} [options.showUserNotifications=true] - Whether to show user notifications
     * 
     * @memberof FrontendErrorHandler
     */
    constructor(options = {}) {
        this.enableLogging = options.enableLogging ?? true;
        this.enableConsoleOutput = options.enableConsoleOutput ?? true;
        this.notificationManager = options.notificationManager || null;
        this.context = options.context || 'Unknown';
        this.showUserNotifications = options.showUserNotifications ?? true;
    }

    /**
     * Creates a standardized success response with optional user notification
     * 
     * @param {*} [data=null] - The response data to include
     * @param {string} [message=null] - Optional success message
     * @param {boolean} [showNotification=false] - Whether to show success notification
     * @returns {StandardResponse} Standardized success response object
     * 
     * @example
     * const result = errorHandler.success(
     *   { users: [...] }, 
     *   'Users loaded successfully',
     *   true
     * );
     * 
     * @memberof FrontendErrorHandler
     */
    success(data = null, message = null, showNotification = false) {
        const response = {
            success: true,
            error: null,
            data
        };

        if (message) {
            response.message = message;
            
            // Show success notification if requested
            if (showNotification && this.showUserNotifications && this.notificationManager) {
                this.notificationManager.showNotification(message, 'success');
            }
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
     * @param {boolean} [options.showNotification=true] - Whether to show user notification
     * @param {string} [options.notificationType='error'] - Type of notification to show
     * @returns {StandardResponse} Standardized failure response object
     * 
     * @example
     * const error = errorHandler.failure('Failed to save data', {
     *   category: ErrorCategory.NETWORK,
     *   severity: ErrorSeverity.HIGH,
     *   originalError: networkError,
     *   showNotification: true
     * });
     * 
     * @memberof FrontendErrorHandler
     */
    failure(message = 'Unknown error', options = {}) {
        const {
            category = ErrorCategory.SYSTEM,
            severity = ErrorSeverity.MEDIUM,
            details = null,
            originalError = null,
            showNotification = true,
            notificationType = 'error'
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

        // Show user notification if enabled
        if (showNotification && this.showUserNotifications && this.notificationManager) {
            this.notificationManager.showNotification(message, notificationType);
        }

        // Add details to response in development mode
        if (typeof window !== 'undefined' && window.location?.hostname === 'localhost' && details) {
            errorResponse.details = details;
        }

        return errorResponse;
    }

    /**
     * Handles API response errors with automatic status code interpretation
     * 
     * @param {Response} response - Fetch API response object
     * @param {string} [operation='API request'] - Description of the failed operation
     * @returns {Promise<StandardResponse>} Standardized API error response
     * 
     * @example
     * try {
     *   const response = await fetch('/api/users');
     *   if (!response.ok) {
     *     return await errorHandler.apiError(response, 'User fetch');
     *   }
     * } catch (error) {
     *   return errorHandler.networkError(error, '/api/users');
     * }
     * 
     * @memberof FrontendErrorHandler
     */
    async apiError(response, operation = 'API request') {
        let errorMessage = `${operation} failed`;
        let category = ErrorCategory.NETWORK;
        let severity = ErrorSeverity.HIGH;

        // Interpret status codes
        if (response.status === 400) {
            errorMessage = 'Invalid request data';
            category = ErrorCategory.VALIDATION;
            severity = ErrorSeverity.MEDIUM;
        } else if (response.status === 401) {
            errorMessage = 'Authentication required';
            category = ErrorCategory.AUTHENTICATION;
            severity = ErrorSeverity.HIGH;
        } else if (response.status === 403) {
            errorMessage = 'Permission denied';
            category = ErrorCategory.AUTHORIZATION;
            severity = ErrorSeverity.MEDIUM;
        } else if (response.status === 404) {
            errorMessage = 'Resource not found';
            category = ErrorCategory.BUSINESS;
            severity = ErrorSeverity.MEDIUM;
        } else if (response.status >= 500) {
            errorMessage = 'Server error occurred';
            category = ErrorCategory.SYSTEM;
            severity = ErrorSeverity.HIGH;
        }

        // Try to get error details from response
        let details = null;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
            details = errorData;
        } catch (e) {
            // Response doesn't contain JSON, use default message
        }

        return this.failure(errorMessage, {
            category,
            severity,
            details: {
                ...details,
                status: response.status,
                url: response.url,
                operation
            }
        });
    }

    /**
     * Handles network and connectivity errors
     * 
     * @param {Error} error - Network error object
     * @param {string} [endpoint='Unknown endpoint'] - Endpoint that failed
     * @returns {StandardResponse} Standardized network error response
     * 
     * @example
     * try {
     *   await fetch('/api/data');
     * } catch (networkError) {
     *   return errorHandler.networkError(networkError, '/api/data');
     * }
     * 
     * @memberof FrontendErrorHandler
     */
    networkError(error, endpoint = 'Unknown endpoint') {
        const message = 'Connection failed. Please check your network.';
        
        return this.failure(message, {
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            originalError: error,
            details: { endpoint },
            notificationType: 'error'
        });
    }

    /**
     * Handles form validation errors with field-specific details
     * 
     * @param {Array|Object|string} errors - Validation errors in various formats
     * @param {boolean} [showNotification=true] - Whether to show notification to user
     * @returns {StandardResponse} Standardized validation error response
     * 
     * @example
     * const validationResult = validateForm(formData);
     * if (!validationResult.isValid) {
     *   return errorHandler.validationError(validationResult.errors);
     * }
     * 
     * @memberof FrontendErrorHandler
     */
    validationError(errors, showNotification = true) {
        let message;
        
        if (Array.isArray(errors)) {
            message = errors.map(err => err.msg || err.message || err).join(', ');
        } else if (typeof errors === 'object' && errors.message) {
            message = errors.message;
        } else if (typeof errors === 'string') {
            message = errors;
        } else {
            message = 'Please check your input and try again';
        }

        return this.failure(message, {
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            details: errors,
            showNotification,
            notificationType: 'warning'
        });
    }

    /**
     * Handles authentication-related errors
     * 
     * @param {string} [message='Authentication failed'] - Custom authentication error message
     * @param {boolean} [redirectToLogin=true] - Whether to redirect to login page
     * @returns {StandardResponse} Standardized authentication error response
     * 
     * @example
     * const authError = errorHandler.authError('Session expired', true);
     * 
     * @memberof FrontendErrorHandler
     */
    authError(message = 'Authentication failed', redirectToLogin = true) {
        const response = this.failure(message, {
            category: ErrorCategory.AUTHENTICATION,
            severity: ErrorSeverity.HIGH,
            notificationType: 'error'
        });

        // Redirect to login if requested
        if (redirectToLogin && typeof window !== 'undefined') {
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        }

        return response;
    }

    /**
     * Handles authorization and permission-related errors
     * 
     * @param {string} [message='Permission denied'] - Custom permission error message
     * @param {string} [requiredPermission=''] - The permission that was required
     * @returns {StandardResponse} Standardized authorization error response
     * 
     * @example
     * const permError = errorHandler.permissionError(
     *   'You cannot delete users', 
     *   'user.delete'
     * );
     * 
     * @memberof FrontendErrorHandler
     */
    permissionError(message = 'Permission denied', requiredPermission = '') {
        return this.failure(message, {
            category: ErrorCategory.AUTHORIZATION,
            severity: ErrorSeverity.MEDIUM,
            details: { requiredPermission },
            notificationType: 'warning'
        });
    }

    /**
     * Wraps async functions with standardized error handling
     * 
     * @param {Function} asyncFn - Async function to wrap with error handling
     * @param {WrapperOptions} [options={}] - Error handling options for failures
     * @returns {Function} Wrapped function that returns StandardResponse
     * 
     * @example
     * const safeUserFetch = errorHandler.wrapAsync(async (userId) => {
     *   const response = await fetch(`/api/users/${userId}`);
     *   return await response.json();
     * }, { 
     *   message: 'Failed to fetch user',
     *   category: ErrorCategory.NETWORK 
     * });
     * 
     * @memberof FrontendErrorHandler
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
                    message = 'Operation failed',
                    showNotification = true
                } = options;

                return this.failure(message, {
                    category,
                    severity,
                    originalError: error,
                    showNotification
                });
            }
        };
    }

    /**
     * Wraps API calls with comprehensive error handling
     * 
     * @param {Function} apiFn - API function that returns a fetch promise
     * @param {string} [operation='API operation'] - Description of the operation
     * @returns {Function} Wrapped API function with error handling
     * 
     * @example
     * const safeApiCall = errorHandler.wrapApiCall(
     *   () => fetch('/api/users', { method: 'POST', body: data }),
     *   'Create user'
     * );
     * 
     * const result = await safeApiCall();
     * 
     * @memberof FrontendErrorHandler
     */
    wrapApiCall(apiFn, operation = 'API operation') {
        return async (...args) => {
            try {
                const response = await apiFn(...args);
                
                if (!response.ok) {
                    return await this.apiError(response, operation);
                }

                const data = await response.json();
                
                // If API already returns StandardResponse format, return as-is
                if (data && typeof data === 'object' && 'success' in data) {
                    // Show success notification if present
                    if (data.success && data.message && this.showUserNotifications && this.notificationManager) {
                        this.notificationManager.showNotification(data.message, 'success');
                    }
                    return data;
                }
                
                return this.success(data);
            } catch (error) {
                return this.networkError(error, operation);
            }
        };
    }

    /**
     * Logs error information to console and potentially other outputs
     * 
     * @param {ErrorInfo} errorInfo - Comprehensive error information object
     * @private
     * @memberof FrontendErrorHandler
     */
    logError(errorInfo) {
        if (this.enableConsoleOutput) {
            console.error(`🚨 Frontend Error [${errorInfo.context}]:`, {
                timestamp: errorInfo.timestamp,
                message: errorInfo.message,
                category: errorInfo.category,
                severity: errorInfo.severity,
                stack: errorInfo.originalError?.stack,
                details: errorInfo.details
            });
        }

        // TODO: Implement client-side error reporting to server
        // TODO: Implement integration with error tracking services (Sentry, etc.)
    }

    /**
     * Creates a context-specific error handler instance
     * 
     * @param {string} context - Context name for the new handler
     * @param {FrontendErrorHandlerOptions} [options={}] - Additional options
     * @returns {FrontendErrorHandler} New error handler instance with specified context
     * 
     * @example
     * const userHandler = globalErrorHandler.createContextHandler('UserManager');
     * const authHandler = globalErrorHandler.createContextHandler('AuthController');
     * 
     * @memberof FrontendErrorHandler
     */
    createContextHandler(context, options = {}) {
        return new FrontendErrorHandler({
            enableLogging: this.enableLogging,
            enableConsoleOutput: this.enableConsoleOutput,
            notificationManager: this.notificationManager,
            showUserNotifications: this.showUserNotifications,
            ...options,
            context
        });
    }
}

/**
 * Global frontend error handler instance
 * 
 * @type {FrontendErrorHandler}
 * @global
 */
const globalFrontendErrorHandler = new FrontendErrorHandler({
    context: 'Global',
    enableLogging: true,
    enableConsoleOutput: true
});

export {
    FrontendErrorHandler,
    ErrorSeverity,
    ErrorCategory,
    globalFrontendErrorHandler
};
