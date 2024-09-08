import { AxiosError } from "axios";
import { TGenericErrorResponse } from "../interface/errors.interface";

const handleAxiosError = (err: any) : TGenericErrorResponse=> {
    const message = err?.response?.data?.message || 'Request failed. Please try again later.'
    return {
        statusCode: err?.response?.status || 500,
        message: message,
        errorSource: [],
    }
}

export default handleAxiosError;