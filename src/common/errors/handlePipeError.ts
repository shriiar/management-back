import { HttpStatus, ValidationError } from '@nestjs/common';
import { TGenericErrorResponse } from '../interface/errors.interface';

const handlePipeError = (err: ValidationError[]): TGenericErrorResponse => {
	const errorSource = err?.map((error) => ({
		path: error.property,
		message: error?.children ? error?.children[0]?.constraints[Object.keys(error?.children[0]?.constraints)[0]] :
			error?.constraints[Object.keys(error?.constraints)[0]],
	}));

	return {
		statusCode: HttpStatus.BAD_REQUEST,
		message: errorSource?.[0]?.message || 'Validation Error',
		errorSource: errorSource,
	};
};

export default handlePipeError;
