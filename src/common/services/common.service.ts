import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from 'src/modules/company/company.model';
import { User } from 'src/modules/users/users.model';
import { COLLECTIONS } from '../config/consts';

@Injectable()
export class CommonService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
	) { }

	async isEmailUsed(email: string): Promise<boolean> {

		const res = await this.companyModel.aggregate([

			// Match email in the company collection
			{
				$match: {
					email: email
				}
			},

			// Union with the user collection
			{
				$unionWith: {
					coll: COLLECTIONS.users,
					pipeline: [
						{
							$match: {
								email: email
							}
						}
					]
				}
			},
		]).exec();

		const data = res.length > 0 ? true : false;
		return data;
	}
}
