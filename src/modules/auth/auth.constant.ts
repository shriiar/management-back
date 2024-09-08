export const AUTH_ERROR_CAUSE = {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_VERIFIED: 'USER_NOT_VERIFIED',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    USER_BLOCKED: 'USER_BLOCKED',
    USER_DELETED: 'USER_DELETED',
    NOT_ALLOWED: 'NOT_ALLOWED',
}


// Used on service level (business logic)
export const AUTH_ERROR_MESSAGES = {
    // Login error messages for both email and social login/register
    LOGIN: {
        USER_NOT_FOUND: 'You are not registered yet.',
        USER_DELETED: 'Your account has been deleted. Please contact support.',
        USER_BLOCKED: 'Your account has been blocked. Please contact support.',
        INVALID_CREDENTIALS: 'You have entered an invalid email or password',
        USER_NOT_VERIFIED: 'Your account verification is pending. Please verify your account.',
    },

    // Change password error messages
    CHANGE_PASSWORD: {
        PASSWORD_NOT_MATCHED: 'Your current password is incorrect.',
    },

    // Reset password error messages
    RESET_PASSWORD: {
        EXPIRED_CODE: 'The provided code has expired. Please request a new one.',
        INVALID_TOKEN: 'The provided token is invalid.',
    },

}


// Used on controller level (response messages)
export const AUTH_SUCCESS_MESSAGES = {
    LOGIN: 'You have successfully logged in.',
    REGISTER: 'You have successfully registered.',
    CHANGE_PASSWORD: 'You have successfully changed your password.',
    FORGOT_PASSWORD: 'A verification code has been sent to your email.',
    RESET_PASSWORD: 'You have successfully reset your password.',
}