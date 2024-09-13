import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './services/payment.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule
	],
	controllers: [PaymentController],
	providers: [PaymentService],
	exports: [PaymentService]
})
export class PaymentModule { }
