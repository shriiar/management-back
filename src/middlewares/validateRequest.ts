// import { NextFunction, Request, Response } from 'express';
// import { AnyZodObject } from 'zod';

import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";

// const validateRequest = (schema: AnyZodObject) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       await schema.parseAsync({
//         body: req.body,
//       });
//       next();
//     } catch (error) {
//       next(error);
//     }
//   };
// };

// export default validateRequest;


@Injectable()
export class ValidateRequestMiddleware implements NestMiddleware {
  // constructor() { }

  use(req: Request, res: Response, next: NextFunction) {
    // console.log('Request...', req.url);
    next();
  }
}