import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { 
    // // add custom message for unauthorized request
    // handleRequest(err, user, info, context) {
    //     console.log("JwtAuthGuard", user);
    //     if (err || !user) {
    //         // throw err || new UnauthorizedException('Unauthorized access');
    //     }
    //     return user;
    // }
}
