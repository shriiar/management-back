export const generateResponse = <T>( success: boolean, statusCode: number, message: string, data: T ) => {
    return {
        success,
        statusCode,
        message,
        data
    }
}