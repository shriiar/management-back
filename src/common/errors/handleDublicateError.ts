import { TGenericErrorResponse } from "../interface/errors.interface";


const handleDublicateError = (err:any) : TGenericErrorResponse=> {

    // Extract the field name and value from the error message.
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    const message = `${field?.charAt(0).toUpperCase() + field?.slice(1)} already exists. Please use another ${field}!`;
    return {
        statusCode: 400,
        message: message,
        errorSource: [{
            path: field,
            message:  `Duplicate field value: ${value}. Please use another ${field}!`,
        }]
    }
}




export default handleDublicateError;