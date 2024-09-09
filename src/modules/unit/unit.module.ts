import { Module } from '@nestjs/common';
import { UnitController } from './unit.controller';
import { UnitService } from './services/unit.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule,
	],
	controllers: [UnitController],
	providers: [UnitService]
})
export class UnitModule { }
