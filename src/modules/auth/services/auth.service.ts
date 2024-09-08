import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/users.model';
import { AUTH_ERROR_CAUSE, AUTH_ERROR_MESSAGES } from '../auth.constant';
import { comparePassword } from 'src/utils/bcrypt.utils';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

	constructor(
		@InjectModel(User.name) private readonly userModel: Model<User>,
		private readonly jwtService: JwtService,
	){}

	async signIn(email: string, pass: string): Promise<{ accessToken: string }> {
		email = email?.toLowerCase();
		const user = await this.userModel.findOne({ email }).select("+password");

		console.log(user);

		if (!user) {
			throw new NotFoundException(AUTH_ERROR_MESSAGES.LOGIN.USER_NOT_FOUND, { cause: AUTH_ERROR_CAUSE.USER_NOT_FOUND });
		}

		if (user.isDeleted) {
			throw new UnauthorizedException(AUTH_ERROR_MESSAGES.LOGIN.USER_DELETED, { cause: AUTH_ERROR_CAUSE.USER_DELETED })
		}

		if (!(await comparePassword(pass, user.password))) {
			throw new UnauthorizedException(AUTH_ERROR_MESSAGES.LOGIN.INVALID_CREDENTIALS, { cause: AUTH_ERROR_CAUSE.INVALID_CREDENTIALS });
		}

		if (!user?.isVerified) {
			throw new UnauthorizedException(AUTH_ERROR_MESSAGES.LOGIN.USER_NOT_VERIFIED, { cause: AUTH_ERROR_CAUSE.USER_NOT_VERIFIED })
		}

		if (user?.isBlocked) {
			throw new UnauthorizedException(AUTH_ERROR_MESSAGES.LOGIN.USER_BLOCKED, { cause: AUTH_ERROR_CAUSE.USER_BLOCKED })
		}

		const accessToken = this.jwtService.sign({
			_id: user._id,
			email: user.email,
			role: user.role,
			imageUrl: user?.imageUrl,
		});

		return {
			accessToken,
		};
	}
}
