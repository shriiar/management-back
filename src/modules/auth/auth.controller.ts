import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response_message.decorator';
import { AuthService } from './services/auth.service';
import { UserLoginDto } from './auth.validation';
import { AUTH_SUCCESS_MESSAGES } from './auth.constant';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

	constructor(
		private authService: AuthService,
	) { }

	@Post('login')
	@ApiBody({ type: UserLoginDto })
	@ResponseMessage(AUTH_SUCCESS_MESSAGES.LOGIN)
	async login(
		@Body() body: UserLoginDto
	) {
		return await this.authService.signIn(body.email, body.password);
	}

}
