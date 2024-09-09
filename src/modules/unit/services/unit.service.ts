import { BadRequestException, Injectable } from '@nestjs/common';
import { IFullUser } from 'src/modules/users/users.interface';
import { AddUnitDto } from '../unit.validation';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Unit, UnitDocument } from '../unit.model';
import { Company } from 'src/modules/company/company.model';
import mongoose, { Model } from 'mongoose';
import { Property } from 'src/modules/property/property.model';
import { COLLECTIONS } from 'src/common/config/consts';

@Injectable()
export class UnitService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Property>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }


	async addUnit(payload: AddUnitDto, user: IFullUser) {

		// Start a session
		const session = await this.connection.startSession();
		try {
			// start transaction
			session.startTransaction();

			const res: any = await this.companyModel.aggregate([

				// inside company check user & property id
				{
					$match: {
						"users": { $in: [new mongoose.Types.ObjectId(user?._id)] },
						"properties": { $in: [new mongoose.Types.ObjectId(payload.property)] }
					}
				},

				// look for property
				{
					$lookup: {
						from: COLLECTIONS.properties,
						localField: "properties",
						foreignField: "_id",
						as: "propery"
					}
				},
				{ $unwind: "$propery" },

				// match with given property id
				{
					$match: {
						"propery._id": new mongoose.Types.ObjectId(payload.property)
					}
				},

				// we need to get all the units from that property
				{
					$lookup: {
						from: COLLECTIONS.units,
						localField: "units",
						foreignField: "_id",
						as: "unit"
					}
				},
				{
					$lookup: {
						from: "units",
						localField: "propery.units",
						foreignField: "_id",
						as: "unitsInfo"
					}
				},

				// have all the units number of a property in a custom filed
				{
					$addFields: {
						unitNumbers: {
							$ifNull: [
								{
									$map: {
										input: {
											$filter: {
												input: "$unit",
												as: "unit",
												cond: { $eq: ["$$unit.property", new mongoose.Types.ObjectId(payload.property)] }
											}
										},
										as: "unit",
										in: "$$unit.unitNumber"
									}
								},
								[]
							]
						}
					}
				},

				// project stage
				{
					$project: {
						_id: "$propery._id",
						company: "$propery.company",
						unitsCount: 1,
						allowedUnits: 1,
						properties: 1,
						units: 1,
						propertyUnits: "$propery.units",

						// array consisting of all unit number from the given property
						unitNumbers: 1,

						// filter only to get units associated with given property
						unitsInfo: {
							$filter: {
								input: "$unitsInfo",
								as: "unit",
								cond: { $in: ["$$unit._id", "$propery.units"] }
							}
						}
					}
				},
				{
					$project: {
						_id: 1,
						company: 1,
						unitsCount: 1,
						allowedUnits: 1,
						properties: 1,
						units: 1,
						propertyUnits: 1,
						unitNumbers: 1,

						// unis inside given property 
						unitsInfo: {
							$cond: {
								if: { $eq: [{ $ifNull: ["$unitsInfo", []] }, []] },
								then: [],
								else: {
									$map: {
										input: "$unitsInfo",
										as: "unitsInfo",
										in: {
											_id: "$$unitsInfo._id",
											isOccupied: "$$unitsInfo.isOccupied"
										}
									}
								}
							}
						}
					}
				}
			]).exec();

			if (!res[0]) {
				throw new BadRequestException('Invalid property or the current user is not associated with any company')
			}

			if (res[0]?.unitsCount === res[0]?.allowedUnits) {
				throw new BadRequestException('Allowned units limit excedded')
			}

			if (res[0]?.unitNumbers.includes(payload.unitNumber)) {
				throw new BadRequestException('Given unit number already exist. Try giving another unit number')
			}

			// Adding unit to unitModel
			const newUnit = new this.unitModel({
				description: payload.description,
				unitNumber: payload.unitNumber,
				squareFeet: payload.squareFeet,
				bedroom: payload.bedroom,
				bathroom: payload.bathroom,
				property: payload.property,
				company: user._id
			});
			const savedUnit = await newUnit.save({ session });

			// Update property to include new unit & increment units count
			await this.propertyModel.updateOne(
				{ _id: new mongoose.Types.ObjectId(payload.property) },
				{
					$push: { units: savedUnit._id },
					$inc: { unitsCount: 1 },
				},
				{ session }
			);

			// Update company to include new unit & increment unit count
			await this.companyModel.updateOne(
				{ _id: new mongoose.Types.ObjectId(user?.company) },
				{
					$push: { units: savedUnit._id },
					$inc: { unitsCount: 1 },
				},
				{ session }
			);

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedUnit;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}
