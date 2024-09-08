import { Injectable } from '@nestjs/common';
import {
	MongooseOptionsFactory,
	MongooseModuleOptions,
} from '@nestjs/mongoose';
import envConfig from '../config/envConfig';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
	constructor() { }

	createMongooseOptions():
		| MongooseModuleOptions
		| Promise<MongooseModuleOptions> {
		const databaseHost = `${envConfig().DATABASE_HOST}`;
		const databaseName = `${envConfig().DATABASE_NAME}`;

		return {
			uri: databaseHost,
			dbName: databaseName,
		};
	}
}
