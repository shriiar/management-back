import { Module } from '@nestjs/common';
import { LeaseController } from './lease.controller';
import { LeaseService } from './services/lease.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';
import { CommonService } from 'src/common/services/common.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule,
		PaymentModule,
	],
	controllers: [LeaseController],
	providers: [LeaseService, CommonService]
})
export class LeaseModule { }
