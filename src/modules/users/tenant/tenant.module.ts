import { forwardRef, Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './services/tenant.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		forwardRef(() => UsersModule),
		HttpModule,
	],
	controllers: [TenantController],
	providers: [TenantService]
})
export class TenantModule { }
