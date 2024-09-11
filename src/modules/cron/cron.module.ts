import { Module } from '@nestjs/common';
import { CronService } from './services/cron.service';
import { CronLeaseService } from './services/cron-lease.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule
	],
	providers: [CronService, CronLeaseService]
})
export class CronModule { }
