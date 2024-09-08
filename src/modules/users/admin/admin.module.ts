import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './services/admin.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		forwardRef(() => UsersModule),
		HttpModule,
	],
	controllers: [AdminController],
	providers: [AdminService],
	exports: [AdminService]
})
export class AdminModule { }
