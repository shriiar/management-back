import { BadRequestException, Injectable } from '@nestjs/common';
import { AddLeaseDto } from '../lease.validation';
import { IFullUser } from 'src/modules/users/users.interface';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User } from 'src/modules/users/users.model';
import { Company } from 'src/modules/company/company.model';
import mongoose, { Model } from 'mongoose';
import { Property } from 'src/modules/property/property.model';
import { Unit } from 'src/modules/unit/unit.model';
import { Prospect } from 'src/modules/prospect/prospect.model';
import { COLLECTIONS, REFERENCE } from 'src/common/config/consts';
import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from 'src/common/config/timezone.config';
import { isValidDate } from 'src/utils/dateHandler';
import { populateLedgers, validateLedgerDate } from 'src/utils/leaseHandler';
import { CommonService } from 'src/common/services/common.service';
import { Lease, LeaseDocument } from '../lease.model';
import { Rent } from '../lease-rent.model';
import { Ledger } from '../lease-ledger.model';
import { USER_ROLE } from 'src/modules/users/users.constant';
import { IRent } from '../lease.interface';

@Injectable()
export class LeaseService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Prospect.name) private readonly prospectModel: Model<Prospect>,
		@InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
		@InjectModel(Rent.name) private readonly rentModel: Model<Rent>,
		@InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
		@InjectConnection() private readonly connection: mongoose.Connection,

		// services
		private readonly commonService: CommonService
	) { }

	// add lease function
	async addLease(payload: AddLeaseDto, user: IFullUser): Promise<LeaseDocument | any> {

		const { leaseStart, leaseEnd, rents, property, unit, prospect, tenant } = payload;

		// Start a session
		const session = await this.connection.startSession();
		try {
			// Start transaction
			session.startTransaction();

			// Fetch unit and associated data using aggregation
			const [data] = await this.unitModel.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(unit),
						property: new mongoose.Types.ObjectId(property),
						company: new mongoose.Types.ObjectId(user?.company),
					}
				},

				// getting property 
				{
					$lookup: {
						from: COLLECTIONS.properties,
						localField: REFERENCE.property,
						foreignField: "_id",
						as: "property"
					}
				},
				{ $unwind: "$property" },

				// getting prospect
				{
					$lookup: {
						from: COLLECTIONS.prospects,
						let: { id: new mongoose.Types.ObjectId(prospect) },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ['$_id', '$$id'] },
										]
									}
								}
							},
							{
								$project: {
									_id: 1,
									name: 1,
									email: 1,
									isApproved: 1,
								}
							}
						],
						as: 'prospect'
					}
				},
				{ $unwind: "$prospect" },

				// getting future leases if have any
				{
					$lookup: {
						from: COLLECTIONS.leases,
						localField: REFERENCE.futureLeases,
						foreignField: "_id",
						as: "futureLeases"
					}
				},

				// getting current occupied lease if have any
				{
					$lookup: {
						from: COLLECTIONS.leases,
						localField: REFERENCE.lease,
						foreignField: "_id",
						as: "occupiedLease"
					}
				},
				{
					$unwind: {
						path: "$occupiedLease",
						preserveNullAndEmptyArrays: true // handling null values
					}
				},

				// project stage
				{
					$project: {

						// unit data
						_id: 1,
						isOccupied: 1,
						lease: 1,
						company: 1,
						tenantHistories: 1,
						tenant: 1,

						// property data
						property: {
							_id: "$property._id",
							occupiedUnits: "$property.occupiedUnits"
						},

						// occupied lease data if there is else null
						occupiedLease: {
							$cond: {
								if: { $eq: ["$occupiedLease", null] },
								then: null,
								else: {
									_id: "$occupiedLease._id",
									leaseStart: "$occupiedLease.leaseStart",
									leaseEnd: "$occupiedLease.leaseEnd"
								}
							}
						},

						// array of data for future lease if have any
						futureLeases: {
							$map: {
								input: "$futureLeases",
								as: "futureLease",
								in: {
									_id: "$$futureLease._id",
									leaseStart: "$$futureLease.leaseStart",
									leaseEnd: "$$futureLease.leaseEnd"
								}
							}
						},

						// prospect data
						prospect: {
							_id: "$prospect._id",
							name: "$prospect.name",
							email: "$prospect.email",
							isApproved: "$prospect.isApproved",
						}
					}
				}
			]).exec();

			if (!data) throw new BadRequestException('Invalid request');
			if (!data?.prospect?.isApproved) throw new BadRequestException('The prospect is not approved yet. To assign it to a new unit, change the status to approved.');

			// validate the dates
			if (!isValidDate(leaseStart) || !isValidDate(leaseEnd)) throw new BadRequestException('Invalid date range');

			// check date range
			if (leaseStart > leaseEnd) throw new BadRequestException('Lease start date must be before lease end date');

			// Validate lease end date. Must be end of the given month
			const lastDayOfMonth = moment(leaseEnd).endOf('month').format('YYYY-MM-DD');
			if (lastDayOfMonth !== leaseEnd) throw new BadRequestException('Lease end date must be the last day of the given month');

			const today = moment().tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');
			const isFuture = leaseStart > today;
			const isPast = leaseEnd < today;

			// Validate the given date range
			validateLedgerDate(data, payload);

			// Tenant operations if in present or future
			let tenantId = null;
			if (!isPast) {

				// assign new tenant id
				tenantId = new mongoose.Types.ObjectId();

				// check email if being used
				if (await this.commonService.isEmailUsed(tenant.email)) throw new BadRequestException('Provided tenant email is already in use');

				// Add tenant user
				const newUser = new this.userModel({
					_id: tenantId,
					name: tenant.name,
					email: tenant.email,
					password: tenant.password,
					role: USER_ROLE.tenant
				});
				const savedUser = await newUser.save({ session });

				// Update company with the new tenant user
				await this.companyModel.updateOne(
					{ _id: new mongoose.Types.ObjectId(user?.company) },
					{ $push: { users: savedUser._id } },
					{ session }
				);
			}

			// Lease and rent operations
			const leaseId = new mongoose.Types.ObjectId();

			const { ledgers, rents } = await populateLedgers({
				leaseStart: payload.leaseStart,
				leaseEnd: payload.leaseEnd,
				rents: payload.rents as IRent[],
				tenant: tenantId,
				lease: leaseId,
				unit: payload.unit,
				property: payload.property,
				company: user?.company
			});

			// Insert rents and (if necessary) ledgers
			await Promise.all([
				!isFuture && this.ledgerModel.insertMany(ledgers, { session, ordered: false }),
				this.rentModel.insertMany(rents, { session, ordered: false })
			]);

			// Update property and unit if necessary
			if (!isPast && !isFuture) {
				await this.propertyModel.updateOne({ _id: new mongoose.Types.ObjectId(property) }, { $inc: { occupiedUnits: 1 } }, { session });
			}

			// update unit
			await this.unitModel.updateOne(
				{ _id: new mongoose.Types.ObjectId(unit) },
				{
					$set: {
						isOccupied: (isFuture || isPast) ? data?.isOccupied : true,
						lease: (isFuture || isPast) ? data?.lease : leaseId,
						tenant: (isFuture || isPast) ? data?.tenant : tenantId,
					},
					$push: {
						...(isFuture && { futureLeases: leaseId }),
						...(isPast && { tenantHistories: leaseId })
					}
				},
				{ session }
			);

			// remove the prospect as we have converted it to a lease and tenant
			await this.prospectModel.deleteOne({ _id: new mongoose.Types.ObjectId(prospect) });

			// Create and save new lease
			const newLease = new this.leaseModel({
				_id: leaseId,
				leaseStart: payload.leaseStart,
				leaseEnd: payload.leaseEnd,
				rents,
				ledgers: !isFuture ? ledgers : [],
				isFutureLease: !!isFuture,
				isClosed: !!isPast,
				tenant: tenantId,
				unit: new mongoose.Types.ObjectId(payload.unit),
				property: new mongoose.Types.ObjectId(payload.property),
				company: new mongoose.Types.ObjectId(user?.company),
			});

			const savedLease = await newLease.save({ session });

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedLease;
		} catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}

	// start lease function for FUTURE LEASE
	async startLease(leaseId: string, user: IFullUser): Promise<LeaseDocument> {

		// Start a session
		const session = await this.connection.startSession();
		try {
			// Start transaction
			session.startTransaction();

			const [res] = await this.leaseModel.aggregate([
				{
					$match: {
						"_id": new mongoose.Types.ObjectId(leaseId),
						"company": new mongoose.Types.ObjectId(user?.company),
						"isFutureLease": true
					}
				},

				// rent lookup
				{
					$lookup: {
						from: COLLECTIONS.rents,
						localField: REFERENCE.rents,
						foreignField: "_id",
						as: "rents"
					}
				},
				// Add fields stage to directly extract the rents data
				{
					$addFields: {
						rents: {
							$cond: {
								if: { $isArray: "$rents" },
								then: {
									$map: {
										input: "$rents",  // Process rents array
										as: "rent",
										in: {
											_id: "$$rent._id",
											description: "$$rent.description",
											amount: "$$rent.amount",
											paymentDay: "$$rent.paymentDay"
										}
									}
								},
								else: []
							}
						}
					}
				},

				// unit lookup
				{
					$lookup: {
						from: COLLECTIONS.units,
						localField: REFERENCE.unit,
						foreignField: "_id",
						as: "unit"
					}
				},
				{ $unwind: "$unit" },

				// property lookup
				{
					$lookup: {
						from: COLLECTIONS.properties,
						localField: REFERENCE.property,
						foreignField: "_id",
						as: "property"
					}
				},
				{ $unwind: "$property" },

				// match stage
				{
					$match: {
						"unit.futureLeases": { $in: [new mongoose.Types.ObjectId(leaseId)] },
					}
				},

				// project stage
				{
					$project: {

						// local fields
						_id: 1,
						leaseStart: 1,
						leaseEnd: 1,
						tenant: 1,

						// aggregate fields
						property: {
							_id: "$property._id",
							occupiedUnits: "$property.occupiedUnits",
						},
						unit: {
							_id: "$unit._id",
							isOccupied: "$unit.isOccupied",
						},
						rents: 1,
					}
				}
			]).exec();

			if (!res || !res?.unit?._id || !res?.property?._id) {
				throw new BadRequestException("Invalid request");
			}

			if (res?.unit?.isOccupied) {
				throw new BadRequestException('The unit is already occupied by another tenant');
			}

			const today = moment().tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');
			const currentTime = moment().tz(DEFAULT_TIMEZONE).valueOf();
			const leaseStart = res?.leaseStart;
			const leaseEnd = res?.leaseEnd;

			// For now we can start the lease when ever we want
			// if (leaseStart > today) {
			// 	throw new BadRequestException('Lease start date is in future. You cant start the lease for a future tenant');
			// }

			if (leaseEnd < today) {
				throw new BadRequestException('Lease end date for this tenant has passed. You can not start the lease');
			}

			const { ledgers, rents } = await populateLedgers({
				leaseStart: today,
				leaseEnd: res.leaseEnd,
				rents: res.rents,
				tenant: res.tenant,
				lease: res._id,
				unit: res.unit._id,
				property: res.property._id,
				company: user?.company
			});

			// adding ledgers to the ledger collection
			this.ledgerModel.insertMany(ledgers, { session, ordered: false });

			// update property
			await this.propertyModel.updateOne(
				{ _id: res.property._id },
				{ $inc: { occupiedUnits: 1 } },
				{ session }
			);

			// update unit
			await this.unitModel.updateOne(
				{ _id: res.unit._id },
				{
					$set: {
						isOccupied: true,
						lease: new mongoose.Types.ObjectId(leaseId),
						tenant: res.tenant
					},
					$pull: {
						futureLeases: new mongoose.Types.ObjectId(leaseId),
					}
				},
				{ session }
			);

			// update lease
			const savedLease = await this.leaseModel.findOneAndUpdate(
				{ _id: res._id },
				{
					$set: {
						leaseStart: today,
						isFutureLease: false,
						ledgers: ledgers,
					}
				},
				{ session }
			);

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedLease;

		} catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}
