import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/guards/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { EnvVariables } from 'src/common/config/envConsts';
import { DatabaseModule } from 'src/common/database/database.module';

@Module({
	imports: [
		PassportModule,
		UsersModule,
		ConfigModule,
		DatabaseModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => {
				return {
					secret: configService.get(EnvVariables.JWT_ACCESS_SECRET),
					signOptions: {
						expiresIn: configService.get(EnvVariables.JWT_ACCESS_EXPIRES_IN),
					},
				};
			},
			inject: [ConfigService],
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
})

export class AuthModule { }
