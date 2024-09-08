import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  TErrorSource,
  TGenericErrorResponse,
} from '../interface/errors.interface';
import { ValidationError } from 'class-validator';
import handleDublicateError from '../errors/handleDublicateError';
import handlePipeError from '../errors/handlePipeError';
import handleValidationError from '../errors/handleValidationError';
import handleCastError from '../errors/handleCastError';
import { JsonWebTokenError } from '@nestjs/jwt';
import handleJwtError from '../errors/handleJwtError';
import { SESServiceException } from '@aws-sdk/client-ses';
import { AxiosError } from 'axios';
import handleAxiosError from '../errors/handleAxiosError';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger();

  constructor(private readonly httpAdapterHost: HttpAdapterHost,
  ) { }

  catch(exception: any, host: ArgumentsHost) {
    try {
      const { httpAdapter } = this.httpAdapterHost;
      const ctx = host.switchToHttp();
      const request = ctx.getRequest();

      let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = exception?.message || 'Something went wrong';
      let errorInfo = exception?.options || {};
      let errorSources: TErrorSource[] = [
        {
          path: '',
          message: 'Something went wrong',
        },
      ];
      if (exception?.code === 11000) {
        const simplify = handleDublicateError(exception);
        httpStatus = simplify.statusCode;
        message = simplify.message;
        errorSources = simplify?.errorSource;
      } else if (
        Array.isArray(exception) &&
        exception.every((err) => err instanceof ValidationError)
      ) {
        const simplify = handlePipeError(exception);
        httpStatus = simplify.statusCode;
        message = simplify?.message;
        errorSources = simplify?.errorSource;
      } else if (exception?.name === 'ValidationError') {
        const simplify = handleValidationError(exception);
        httpStatus = simplify.statusCode;
        message = simplify?.message;
        errorSources = simplify?.errorSource;
      } else if (exception?.name === 'CastError') {
        const simplify = handleCastError(exception);
        httpStatus = simplify.statusCode;
        message = simplify?.message;
        errorSources = simplify?.errorSource;
      } else if (exception instanceof JsonWebTokenError) {
        const simplify = handleJwtError(exception);
        httpStatus = simplify.statusCode;
        message = simplify?.message;
        errorSources = simplify?.errorSource;
      } else if (exception instanceof SESServiceException) {
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Something went wrong';
        errorSources = [
          {
            path: '',
            message: 'Something went wrong',
          },
        ]
      } else if (exception instanceof HttpException) {
        httpStatus = exception.getStatus();
        message = exception.message;
        errorSources = [
          {
            path: '',
            message: exception.message,
          },
        ]
      } else if(exception instanceof AxiosError) {
        const simplify = handleAxiosError(exception);
        httpStatus = simplify.statusCode;
        message = simplify?.message;
        errorSources = simplify?.errorSource;
      }



      const responseBody: TGenericErrorResponse = {
        statusCode: httpStatus,
        message: message,
        errorInfo: errorInfo,
        errorSource: errorSources,
      };

      // get module name
      const module = ctx.getRequest().url.split('/')[2];

      this.logger.error(`Status: ${responseBody.statusCode} {${request.url}} - ${message}`, `${request.method} - ${module?.toUpperCase()}`)

      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'stg';

      if (isDev) {
       this.logger.warn('\n\nError Stack: ' + exception.stack );
      }

      httpAdapter.reply(
        ctx.getResponse(),
        responseBody,
        responseBody.statusCode || httpStatus,
      );
    } catch (error) {
      this.logger.error('An unexpected error occured in the exception filter', error);
    }
  }
}
