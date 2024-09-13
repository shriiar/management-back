import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './services/expense.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from 'src/modules/users/users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule,
	],
	controllers: [ExpenseController],
	providers: [ExpenseService]
})
export class ExpenseModule { }
