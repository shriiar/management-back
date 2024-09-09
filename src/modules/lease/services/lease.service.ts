import { Injectable } from '@nestjs/common';
import { AddLeaseDto } from '../lease.validation';
import { IFullUser } from 'src/modules/users/users.interface';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User } from 'src/modules/users/users.model';
import { Company } from 'src/modules/company/company.model';
import mongoose, { Model } from 'mongoose';
import { Property } from 'src/modules/property/property.model';
import { Unit } from 'src/modules/unit/unit.model';
import { Prospect } from 'src/modules/prospect/prospect.model';

@Injectable()
export class LeaseService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Prospect.name) private readonly prospectModel: Model<Prospect>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }

	async addLease(payload: AddLeaseDto, user: IFullUser) {
		

	}
}
