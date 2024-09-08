import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import envConfig from './common/config/envConfig';
import { DatabaseModule } from './common/database/database.module';
import { selectEnv } from './common/env/config';
import { UsersModule } from './modules/users/users.module';
import { GlobalLoggerMiddleware } from './middlewares/globalLogger';
import { AuthModule } from './modules/auth/auth.module';
import { SuperAdminModule } from './modules/users/super-admin/super-admin.module';
import { AdminModule } from './modules/users/admin/admin.module';
import { CompanyModule } from './modules/company/company.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			envFilePath: selectEnv(),
			isGlobal: true,
			load: [envConfig],
		}),
		DatabaseModule,
		AuthModule,
		UsersModule,
		CompanyModule,
	],
	controllers: [],
	providers: [Logger],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(GlobalLoggerMiddleware).forRoutes('*');
	}
}
