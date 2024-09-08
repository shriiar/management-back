import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { IFullUser } from 'src/modules/users/users.interface'

export const CurrentUser = createParamDecorator(
    (_: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        return request.user as IFullUser
    },
)