// game/handlers/validation.js

/**
 * A higher-order function to wrap a handler with Zod validation. It captures the socket
 * and io server references to safely parse incoming payloads.
 * @param {import('zod').ZodSchema} schema The Zod schema to validate against.
 * @param {Function} handler The handler function to execute on successful validation.
 * @returns {Function} A new function that performs validation before executing the handler.
 */
export const withValidation = (schema, handler) => {
    return function(data) {
        const socket = this;
        const io = this.server;
        try {
            const validatedData = schema.parse(data);
            handler(io, socket, validatedData);
        } catch (error) {
            console.error(`[Validation Error] Event: ${handler.name || 'inline handler'}, Error:`, error.errors || error);
            socket.emit('error-message', {
                key: 'validationFailed',
                defaultText: 'Invalid data received. Please try again.',
                context: { errors: error.flatten ? error.flatten() : error },
                fatal: false
            });
        }
    };
};
