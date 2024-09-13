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
import { PropertyModule } from './modules/property/property.module';
import { UnitModule } from './modules/unit/unit.module';
import { ProspectModule } from './modules/prospect/prospect.module';
import { TenantModule } from './modules/users/tenant/tenant.module';
import { LeaseModule } from './modules/lease/lease.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './modules/cron/cron.module';
import { CronLeaseService } from './modules/cron/services/cron-lease.service';
import { ExpenseModule } from './modules/expense/expense.module';
import { PaymentModule } from './modules/payment/payment.module';
import { IncomeModule } from './modules/income/income.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			envFilePath: selectEnv(),
			isGlobal: true,
			load: [envConfig],
		}),
		ScheduleModule.forRoot(),
		DatabaseModule,
		AuthModule,
		UsersModule,
		CompanyModule,
		PropertyModule,
		UnitModule,
		ProspectModule,
		TenantModule,
		LeaseModule,
		CronModule,
		ExpenseModule,
		PaymentModule,
		IncomeModule,
		ReportsModule,
	],
	controllers: [],
	providers: [Logger],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(GlobalLoggerMiddleware).forRoutes('*');
	}
}
