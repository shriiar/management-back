import { BadRequestException, Injectable } from '@nestjs/common';
import { AddExpenseDto } from '../expense.validation';
import { IFullUser } from '../../users/users.interface';
import { Property } from '../../property/property.model';
import { Unit } from '../../unit/unit.model';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Expense } from '../expense.model';
import * as moment from 'moment-timezone'
import { isValidDate } from 'src/utils/dateHandler';
import { DEFAULT_TIMEZONE } from 'src/common/config/timezone.config';
import { COLLECTIONS, REFERENCE } from 'src/common/config/consts';

@Injectable()
export class ExpenseService {

	constructor(
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Property>,
		@InjectModel(Expense.name) private readonly expenseModel: Model<Expense>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }

	public async getPartialExpenses(page: number, limit: number, filter: IGetExpense, user: IFullUser) {

		page = page || 1;
		limit = limit || 10;
		const skip = (page - 1) * limit;

		const { id, month, year } = filter;

		const searchCond: any[] = [];

		if (id) {
			searchCond.push({
				$or: [
					{ property: new mongoose.Types.ObjectId(id) },
					{ unit: new mongoose.Types.ObjectId(id) }
				]
			});
		}
		if (month) {
			searchCond.push({ month: { $eq: month } });
		}
		if (year) {
			searchCond.push({ year: { $eq: year } });
		}

		const matchStage = {
			$match: {
				...(searchCond.length && { $and: searchCond }),
				company: new mongoose.Types.ObjectId(user?.company)
			}
		};

		const lookupStage = [

			// get who added the expense
			{
				$lookup: {
					from: COLLECTIONS.users,
					localField: REFERENCE.addedBy,
					foreignField: "_id",
					as: "addedBy"
				}
			},

			// get who approved the expense
			{
				$lookup: {
					from: COLLECTIONS.users,
					localField: REFERENCE.approvedBy,
					foreignField: "_id",
					as: "approvedBy"
				}
			},

			// get associated property (if have any)
			{
				$lookup: {
					from: COLLECTIONS.properties,
					localField: REFERENCE.property,
					foreignField: "_id",
					as: "property"
				}
			},

			// get associated unit (if have any)
			{
				$lookup: {
					from: COLLECTIONS.units,
					localField: REFERENCE.unit,
					foreignField: "_id",
					as: "unit"
				}
			},

			// insert new fields
			{
				$addFields: {
					addedBy: { $arrayElemAt: ["$addedBy", 0] },
					approvedBy: { $arrayElemAt: ["$approvedBy", 0] },
					property: { $arrayElemAt: ["$property", 0] },
					unit: { $arrayElemAt: ["$unit", 0] }
				}
			}
		];

		const pipeline: any = [
			matchStage,
			...lookupStage,
			{ $sort: filter?.sortBy ? { [filter?.sortBy]: filter?.sortOrder } : { _id: -1 } },
			{ $skip: skip },
			{ $limit: limit },
			{
				$project: {
					_id: 1,
					month: 1,
					year: 1,
					paymentDay: 1,
					isPaid: 1,
			
					// aggregated fields with _id checks
					addedBy: {
						$cond: {
							if: { $gt: [{ $ifNull: ["$addedBy._id", null] }, null] },
							then: {
								_id: "$addedBy._id",
								name: "$addedBy.name",
								email: "$addedBy.email"
							},
							else: null
						}
					},
					approvedBy: {
						$cond: {
							if: { $gt: [{ $ifNull: ["$approvedBy._id", null] }, null] },
							then: {
								_id: "$approvedBy._id",
								name: "$approvedBy.name",
								email: "$approvedBy.email"
							},
							else: null
						}
					},
					property: {
						$cond: {
							if: { $gt: [{ $ifNull: ["$property._id", null] }, null] },
							then: {
								_id: "$property._id",
								address: "$property.address"
							},
							else: null
						}
					},
					unit: {
						$cond: {
							if: { $gt: [{ $ifNull: ["$unit._id", null] }, null] },
							then: {
								_id: "$unit._id",
								unitNumber: "$unit.unitNumber"
							},
							else: null
						}
					}
				}			
			},
			{
				$facet: {
					data: [
						{ $sort: { _id: -1 } },
						{ $skip: skip },
						{ $limit: limit }
					],
					total: [
						{ $count: "total" }
					]
				}
			}
		];

		const res = await this.expenseModel.aggregate(pipeline).exec();
		return {
			data: res[0]?.data || [],
			total: res[0]?.total[0]?.total || 0
		};
	}

	// add expense for property & unit
	async addExpense(payload: AddExpenseDto, user: IFullUser) {

		const { date, description, amount, note, isPaid, addTo, addToId } = payload;

		// validate given date
		if (!isValidDate(date)) {
			throw new BadRequestException('Invalid date. The date format should be YYYY-MM-DD');
		}

		// Start a session
		const session = await this.connection.startSession();
		try {
			// start transaction
			session.startTransaction();

			const monthYear = moment.tz(date, DEFAULT_TIMEZONE);

			const model = addTo === 'property' ? this.propertyModel : this.unitModel;
			const field = addTo === 'property' ? 'property' : 'unit';
			const otherField = addTo === 'property' ? 'unit' : 'property';

			// Fetch the relevant document (either property or unit)
			const [res] = await model.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(addToId),
						company: new mongoose.Types.ObjectId(user?.company),
					},
				},
			]).exec();
			console.log(res);
			if (!res) {
				throw new BadRequestException('Invalid request');
			}

			// Create a new expense
			const newExpense = new this.expenseModel({
				paymentDay: date,
				month: monthYear.month() + 1,
				year: monthYear.year(),
				amount: amount,
				description: description,
				note: note,
				addedBy: user?._id,
				[field]: new mongoose.Types.ObjectId(addToId), // Set the correct field (property or unit)
				[otherField]: null, // Set the other field to null
				company: user?.company,
			});

			const savedData = await newExpense.save({ session });

			// Update the relevant document (either property or unit) to store the expense
			await model.updateOne(
				{ _id: new mongoose.Types.ObjectId(addToId) },
				{
					$push: { expensePerMonth: savedData._id },
				},
				{ session },
			);

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedData;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}

interface IGetExpense {
	month: number;
	year: number;
	id: string; // property id or unit id
	sortBy: string;
	sortOrder: number;
}
