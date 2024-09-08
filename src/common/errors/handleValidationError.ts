import mongoose from 'mongoose';
import { TGenericErrorResponse } from '../interface/errors.interface';

const handleValidationError = (err: mongoose.Error.ValidationError) : TGenericErrorResponse => {
  return {
    statusCode: 400,
    message: 'Validation Error',
    errorSource: Object.values(err.errors).map((error) => {
      return {
        path: error?.path,
        message: error?.message,
      };
    }),
  };
};

export default handleValidationError;