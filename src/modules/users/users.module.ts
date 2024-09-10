import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { AdminModule } from './admin/admin.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
	imports: [
		DatabaseModule,
		SuperAdminModule,
		AdminModule,
		TenantModule
	],
	providers: [UsersService],
	controllers: [],
	exports: [UsersService],
})
export class UsersModule { }
