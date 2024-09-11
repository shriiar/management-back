import { BadRequestException, Injectable } from '@nestjs/common';
import { IFullUser } from 'src/modules/users/users.interface';
import { AddProspectDto } from '../prospect.validation';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Unit } from 'src/modules/unit/unit.model';
import { COLLECTIONS, REFERENCE } from 'src/common/config/consts';
import { Prospect, ProspectDocument } from '../prospect.model';
import { promises } from 'dns';

@Injectable()
export class ProspectService {

	constructor(
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Prospect.name) private readonly prospectModel: Model<Prospect>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }

	async addProspect(payload: AddProspectDto, user: IFullUser): Promise<ProspectDocument> {

		const { name, email, property, unit } = payload

		// Start a session
		const session = await this.connection.startSession();
		try {
			// start transaction
			session.startTransaction();

			// aggregate in unit col for validation
			const [res] = await this.unitModel.aggregate([
				// match unit and associated property, company
				{
					$match: {
						"_id": new mongoose.Types.ObjectId(unit),
						"property": new mongoose.Types.ObjectId(property),
						"company": new mongoose.Types.ObjectId(user?.company),
					}
				},

				// lookup in the company col to get the company partial data
				{
					$lookup: {
						from: COLLECTIONS.companies,
						localField: REFERENCE.company,
						foreignField: "_id",
						as: "company"
					}
				},

				// unwind the company array to work with individual company objects
				{
					$unwind: {
						path: "$company",
						preserveNullAndEmptyArrays: true // handle null values
					}
				},

				// // match provided property and unit exist in the company
				{
					$match: {
						"company.units": { $in: [new mongoose.Types.ObjectId(unit)] },
						"company.properties": { $in: [new mongoose.Types.ObjectId(property)] }
					}
				},

				// lookup in the property col to get the property partial data
				{
					$lookup: {
						from: COLLECTIONS.properties,
						localField: REFERENCE.property,
						foreignField: "_id",
						as: "property"
					}
				},

				// unwind the property array to work with individual property objects
				{
					$unwind: {
						path: "$property",
						preserveNullAndEmptyArrays: true // handle null values
					}
				},

				// match provided unit exist in the property
				{
					$match: {
						"property.units": { $in: [new mongoose.Types.ObjectId(unit)] },
					}
				},

				// project stage to get partial data
				{
					$project: {
						_id: 1,
						property: "$property._id",
						company: "$company._id",
					}
				}
			]).exec();
			if (!res) {
				throw new BadRequestException("Invalid request");
			}

			// Adding prospect to prospectModel
			const newProspect = new this.prospectModel({
				name: name,
				email: email,
				company: user?.company,
				property: new mongoose.Types.ObjectId(property),
				unit: new mongoose.Types.ObjectId(unit),
			});
			const savedprospect = await newProspect.save({ session });

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedprospect
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}
