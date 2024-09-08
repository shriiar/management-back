import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './services/super-admin.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		HttpModule,
	],
	controllers: [SuperAdminController],
	providers: [SuperAdminService],
	exports: [SuperAdminService],
})
export class SuperAdminModule { }
