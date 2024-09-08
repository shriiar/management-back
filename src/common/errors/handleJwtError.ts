import { TGenericErrorResponse } from "../interface/errors.interface";

const handleJwtError = (err: any) : TGenericErrorResponse=> {
    
    const message = err?.name === 'TokenExpiredError' ? 'Your token has been expired.' : 'Your token is invalid.';
    
    return {
        statusCode: 400,
        message,
        errorSource: [{
            path: '',
            message: err?.message
        }]
    }
}

export default handleJwtError;