import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './services/property.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		DatabaseModule,
		UsersModule,
		HttpModule,
	],
	controllers: [PropertyController],
	providers: [PropertyService]
})
export class PropertyModule { }
