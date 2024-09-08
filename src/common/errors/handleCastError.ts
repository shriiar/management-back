import { TGenericErrorResponse } from "../interface/errors.interface";

const handleCastError = (err: any) : TGenericErrorResponse=> {
    // const message = `Invalid ${err.path}: ${err?.value?.[err?.path]}. Please provide a valid ${err.path}`;
    const message = `Please provide a valid ${err.path}`;
    return {
        statusCode: 400,
        message: message,
        errorSource: [{
            path: err?.path,
            message: err?.message,
        }],
    }
}

export default handleCastError;