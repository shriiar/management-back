import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class GlobalLoggerMiddleware implements NestMiddleware {
    constructor(
    private readonly loggerService: Logger
    ) { }
  use(req: Request, res: Response, next: NextFunction) {
    // const protocol = req.protocol; // http or https
    // const host = req.get("host"); // localhost
    const originalUrl = req.originalUrl; // /api/v1/users
    const method = req.method; // GET, POST, PUT, DELETE
    const ip = req.ip; // ::1


    // ${protocol}://${host}${originalUrl} ${date} ${time}
    this.loggerService.log( `Request: {${originalUrl}} - from ${ip}`, `${method} - GlobalLogger`);
        
    next();
  }
}