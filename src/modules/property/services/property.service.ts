import { BadRequestException, Injectable } from '@nestjs/common';
import { AddPropertyDto } from '../property.validation';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Company } from 'src/modules/company/company.model';
import { Property, PropertyDocument } from '../property.model';
import { IFullUser } from 'src/modules/users/users.interface';
import { CompanyService } from 'src/modules/company/services/company.service';

@Injectable()
export class PropertyService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }

	public async getPartialProperties(filter: propertyFilter, user: IFullUser) {

		const { name, address, unitsCount, occupiedUnits } = filter;

		return this.propertyModel.aggregate([
			{
				$match: {
					company: new mongoose.Types.ObjectId(user?.company),
				},
			},
			{
				$sort: { createdAt: -1 },
			},
			{
				$match: {
					...(name ? { name: { $regex: name, $options: 'i' } } : {}),
					...(address ? { address: { $regex: address, $options: 'i' } } : {}),
					...(unitsCount ? { unitsCount: { $eq: unitsCount } } : {}),
					...(occupiedUnits ? { occupiedUnits: { $eq: occupiedUnits } } : {}),
				},
			},

			// Sort by createdAt in descending order
			{
				$sort: { createdAt: -1 },
			},

			// Project the necessary fields
			{
				$project: {
					name: 1,
					address: 1,
					city: 1,
					unitsCount: 1,
					occupiedUnits: 1,
					company: 1,
				},
			},
		]).exec();
	}

	async addProperty(payload: AddPropertyDto, user: IFullUser): Promise<PropertyDocument> {

		// Start a session
		const session = await this.connection.startSession();
		try {
			// start transaction
			session.startTransaction();

			// check the user's company if exist
			const company: any = await this.companyModel.findById(user.company).exec();
			if (!company) {
				throw new BadRequestException("Invalid request");
			}

			// check if unitsCount of the property is less than or equal to
			if (payload.unitsCount > company.allowedUnits) {
				throw new BadRequestException("Toatl units of the property can not be greater than companies allowed unit");
			}

			// Adding property to propertyModel
			const newProperty = new this.propertyModel({
				name: payload.name,
				address: payload.address,
				city: payload.city,
				unitsCount: payload.unitsCount,
				company: company._id
			});
			const savedProperty = await newProperty.save({ session });

			// store added properties id inside associated company
			company.properties.push(savedProperty._id);
			company.save();

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedProperty;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}

interface propertyFilter {
	name: string,
	address: string,
	unitsCount: number,
	occupiedUnits: number,
}