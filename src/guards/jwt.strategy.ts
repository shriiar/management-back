import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IUser } from 'src/modules/users/users.interface'
import { EnvVariables } from '../common/config/envConsts'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly conf: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: conf.get(EnvVariables.JWT_ACCESS_SECRET),
        })
    }

    // set all user but the password on the JWT
    async validate({ password, ...rest }: IUser) {
        return rest
    }
}
