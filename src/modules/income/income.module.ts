import { Module } from '@nestjs/common';
import { IncomeController } from './income.controller';
import { IncomeService } from './services/income.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';
import { PaymentModule } from '../payment/payment.module';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule,
		PaymentModule,
	],
	controllers: [IncomeController],
	providers: [IncomeService]
})
export class IncomeModule { }
