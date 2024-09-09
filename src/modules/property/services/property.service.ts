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
