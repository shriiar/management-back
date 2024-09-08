import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './services/company.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule
	],
	controllers: [CompanyController],
	providers: [CompanyService],
	exports: [CompanyService]
})
export class CompanyModule { }
