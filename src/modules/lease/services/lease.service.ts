import { BadRequestException, Injectable } from '@nestjs/common';
import { AddLeaseDto, RenewLeaseDto } from '../lease.validation';
import { IFullUser } from 'src/modules/users/users.interface';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User } from 'src/modules/users/users.model';
import { Company } from 'src/modules/company/company.model';
import mongoose, { Model, Types } from 'mongoose';
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
import { IRent, LeaseStatus } from '../lease.interface';
import { PaymentService } from 'src/modules/payment/services/payment.service';

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
		private readonly commonService: CommonService,
		private readonly paymentService: PaymentService,
	) { }

	async getLeases(page: number, limit: number, filter: IGetLeases, user: IFullUser) {

		page = page || 1;
		limit = limit || 10;
		const skip = (page - 1) * limit;

		const todayDate = moment().tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');

		let { propertyId, unitId, name, email, isFutureLease, fromStart, toStart, fromEnd, toEnd, sortBy, sortOrder } = filter;

		if (fromStart && !toStart) {
			toStart = todayDate;
		}
		if (fromEnd && !toEnd) {
			toEnd = todayDate;
		}

		const searchCond: any[] = [];
		const aggregatedSearchCond: any[] = [];

		if (fromStart && toStart) {
			searchCond.push({ leaseStart: { $gte: fromStart, $lte: toStart } });
		}
		if (fromEnd && toEnd) {
			searchCond.push({ leaseEnd: { $gte: fromEnd, $lte: toEnd } });
		}
		if (propertyId) {
			searchCond.push({ propertyId: new mongoose.Types.ObjectId(propertyId) });
		}
		if (unitId) {
			searchCond.push({ unitId: new mongoose.Types.ObjectId(unitId) });
		}

		// aggregated search
		if (name) {
			aggregatedSearchCond.push({ "tenant.name": { $regex: name, $options: 'i' } });
		}
		if (email) {
			aggregatedSearchCond.push({ "tenant.email": { $regex: email, $options: 'i' } });
		}

		const matchStage = {
			$match: {
				...(searchCond.length && { $and: searchCond }),
				company: new mongoose.Types.ObjectId(user?.company),
				isFutureLease: isFutureLease || false,
			}
		};

		const aggregatedMatchStage = {
			$match: {
				...(aggregatedSearchCond.length && { $and: aggregatedSearchCond }),
				company: new mongoose.Types.ObjectId(user?.company)
			}
		};

		const lookupStage = [

			// used to calculate the due amount
			{
				$lookup: {
					from: COLLECTIONS.ledgers,
					localField: "_id",
					foreignField: "lease",
					as: "ledgers"
				}
			},
			{
				$addFields: {
					totalDue: {
						$sum: {
							$map: {
								input: {
									$filter: {
										input: "$ledgers",
										as: "ledger",
										cond: {
											$and: [
												{ $lte: ["$$ledger.paymentDay", todayDate] },
												{ $eq: ["$$ledger.isPaid", false] }
											]
										}
									}
								},
								as: "balance",
								in: "$$balance.balance"
							}
						}
					}
				}
			},

			// gets tenant information
			{
				$lookup: {
					from: COLLECTIONS.users,
					localField: REFERENCE.tenant,
					foreignField: "_id",
					as: "tenant"
				}
			},

			// property info
			{
				$lookup: {
					from: COLLECTIONS.properties,
					localField: REFERENCE.property,
					foreignField: "_id",
					as: "property"
				}
			},

			// unit info
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
					tenant: { $arrayElemAt: ["$tenant", 0] },
					property: { $arrayElemAt: ["$property", 0] },
					unit: { $arrayElemAt: ["$unit", 0] }
				}
			}
		];

		const pipeline: any = [
			matchStage,
			...lookupStage,
			aggregatedMatchStage,
			{ $sort: sortBy ? { [sortBy]: sortOrder } : { _id: -1 } },
			{ $skip: skip },
			{ $limit: limit },
			{
				$project: {
					name: 1,
					email: 1,
					propertyAddress: 1,
					unitNumber: 1,
					leaseStart: 1,
					leaseEnd: 1,
					totalDue: 1,
					expiresIn: {
						$divide: [
							{
								$subtract: [
									{ $dateFromString: { dateString: "$leaseEnd" } },
									{ $dateFromString: { dateString: todayDate } }
								]
							},
							1000 * 60 * 60 * 24
						]
					},
					tenant: {
						_id: "$tenant._id",
						name: "$tenant.name",
						email: "$tenant.email"
					},
					property: {
						_id: "$property._id",
						address: "$property.address"
					},
					unit: {
						_id: "$unit._id",
						unitNumber: "$unit.unitNumber",
						isOccupied: "$unit.isOccupied"
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

		const res = await this.leaseModel.aggregate(pipeline).exec();
		return {
			data: res[0]?.data || [],
			total: res[0]?.total[0]?.total || 0
		};
	}

	// add lease function
	async addLease(payload: AddLeaseDto, user: IFullUser): Promise<LeaseDocument | any> {

		const { leaseStart, leaseEnd, rents, property, unit, prospect, tenant } = payload;

		// Start a session
		const session = await this.connection.startSession();
		try {
			// Start transaction
			session.startTransaction();

			// Fetch unit and associated data using aggregation
			const [res] = await this.unitModel.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(unit),
						property: new mongoose.Types.ObjectId(property),
						company: new mongoose.Types.ObjectId(user?.company),
					}
				},

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
						leaseHistories: 1,
						tenant: 1,
						property: 1,

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

			if (!res) throw new BadRequestException('Invalid request');
			if (!res?.prospect?.isApproved) throw new BadRequestException('The prospect is not approved yet. To assign it to a new unit, change the status to approved.');

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
			validateLedgerDate({
				leaseStart: leaseStart,
				leaseEnd: leaseEnd,
				occupiedLease: res?.occupiedLease || null,
				futureLeases: res?.futureLeases || []
			});

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
					role: USER_ROLE.tenant,
					company: user?.company
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
				leaseStart: leaseStart,
				leaseEnd: leaseEnd,
				rents: payload.rents as IRent[],
				tenant: tenantId,
				lease: leaseId,
				unit: unit,
				property: property,
				company: user?.company
			});

			// Insert rents and (if necessary) ledgers
			await Promise.all([
				!isFuture && this.ledgerModel.insertMany(ledgers, { session, ordered: false }),
				this.rentModel.insertMany(rents, { session, ordered: false })
			]);

			// Update property and unit if necessary
			if (!isPast && !isFuture) {
				await this.propertyModel.updateOne(
					{ _id: new mongoose.Types.ObjectId(property) },
					{ $inc: { occupiedUnits: 1 } },
					{ session }
				)
			};

			// update unit
			await this.unitModel.updateOne(
				{ _id: new mongoose.Types.ObjectId(unit) },
				{
					$set: {
						isOccupied: (isFuture || isPast) ? res?.isOccupied : true,
						lease: (isFuture || isPast) ? res?.lease : leaseId,
						tenant: (isFuture || isPast) ? res?.tenant : tenantId,
					},
					$push: {
						...(isFuture && { futureLeases: leaseId }),
						...(isPast && { leaseHistories: leaseId })
					}
				},
				{ session }
			);

			// remove the prospect as we have converted it to a lease and tenant
			await this.prospectModel.deleteOne({ _id: new mongoose.Types.ObjectId(prospect) }, { session });

			// create a customer for new lease in cardknox
			const customer: string = !isPast ? await this.paymentService.createCustomer({
				name: tenant.name,
				email: tenant.email,
			}) : '';

			// Create and save new lease
			const newLease = new this.leaseModel({
				_id: leaseId,
				leaseStart: leaseStart,
				leaseEnd: leaseEnd,
				status: (!isFuture && !isPast) ? LeaseStatus.ACTIVE : ((isPast) ? LeaseStatus.INACTIVE : LeaseStatus.PENDING),
				rents,
				ledgers: !isFuture ? ledgers : [],
				isFutureLease: !!isFuture,
				isClosed: !!isPast,
				cardknox: !isPast ? { customer: customer } : { customer: '' },
				tenant: tenantId,
				unit: new mongoose.Types.ObjectId(unit),
				property: new mongoose.Types.ObjectId(property),
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
						property: 1,

						// aggregate fields
						unit: {
							_id: "$unit._id",
							isOccupied: "$unit.isOccupied",
						},
						rents: 1,
					}
				}
			]).exec();

			if (!res) {
				throw new BadRequestException("Invalid request");
			}

			if (res.unit.isOccupied) {
				throw new BadRequestException('The unit is already occupied by another tenant');
			}

			const today = moment().tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');
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
				property: res.property,
				company: user?.company
			});

			// adding ledgers to the ledger collection
			this.ledgerModel.insertMany(ledgers, { session, ordered: false });

			// update property
			await this.propertyModel.updateOne(
				{ _id: res.property },
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
						status: LeaseStatus.ACTIVE
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

	// renew lease function
	async renewLease(payload: RenewLeaseDto, user: IFullUser): Promise<LeaseDocument> {

		const { leaseId, leaseEnd } = payload;

		// Start a session
		const session = await this.connection.startSession();
		try {
			// Start transaction
			session.startTransaction();

			// validating lease date
			if (!isValidDate(leaseEnd)) {
				throw new BadRequestException('Invalid lease end date')
			}

			// lease end date must be last day of the given month
			const lastDayOfMonth = moment(leaseEnd).endOf('month').format('YYYY-MM-DD')
			if (lastDayOfMonth !== leaseEnd) {
				throw new BadRequestException('Lease end date must be last day of the given month')
			}

			const [res] = await this.leaseModel.aggregate([
				{
					$match: {
						"_id": new mongoose.Types.ObjectId(leaseId),
						"company": new mongoose.Types.ObjectId(user?.company),
						"isEviction": false,
						"isClosed": false,
						"isFutureLease": false
					}
				},

				// get associated unit
				{
					$lookup: {
						from: COLLECTIONS.units,
						localField: "unit",
						foreignField: "_id",
						as: "unitData"
					}
				},
				{ $unwind: "$unitData" },

				// for the assocaited unit get future leases
				{
					$lookup: {
						from: COLLECTIONS.leases,
						localField: "unitData.futureLeases",
						foreignField: "_id",
						as: "futureLeases"
					}
				},
				{
					$project: {
						_id: 1,
						leaseStart: 1,
						leaseEnd: 1,
						tenant: 1,
						unit: 1,
						property: 1,
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
					}
				}
			]).exec();
			if (!res) {
				throw new BadRequestException('Invalid request')
			}

			const newLeaseEnd = leaseEnd;
			const newLeaseStart = moment(res?.leaseEnd).add(1, 'day').format('YYYY-MM-DD');
			const prevLeaseEnd = res?.leaseEnd;

			if (newLeaseEnd <= prevLeaseEnd) {
				throw new BadRequestException('Given lease end must be greater than the current lease end date');
			}

			// Validate the given date range
			validateLedgerDate({
				leaseStart: newLeaseStart,
				leaseEnd: newLeaseEnd,
				occupiedLease: res?.occupiedLease || null,
				futureLeases: res?.futureLeases || []
			});

			const { ledgers, rents } = await populateLedgers({
				leaseStart: newLeaseStart,
				leaseEnd: newLeaseEnd,
				rents: payload.rents as Partial<IRent[]>,
				tenant: res.tenant,
				lease: res._id,
				unit: res.unit,
				property: res.property,
				company: user?.company
			});

			// Insert rents and ledgers
			await Promise.all([
				this.ledgerModel.insertMany(ledgers, { session, ordered: false }),
				this.rentModel.insertMany(rents, { session, ordered: false })
			]);

			// update lease
			const savedLease = await this.leaseModel.findOneAndUpdate(
				{ _id: res._id },
				{
					$set: {
						leaseEnd: newLeaseEnd,
					},
					$push: {
						rents: { $each: rents },
						ledgers: { $each: ledgers }
					}
				},
				{ session }
			);

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedLease;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}

	// end current lease
	async endLease(leaseId: string, user: IFullUser) {

		// Start a session
		const session = await this.connection.startSession();
		try {
			// Start transaction
			session.startTransaction();

			const [res] = await this.leaseModel.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(leaseId),
						company: new mongoose.Types.ObjectId(user?.company),
						isClosed: false,
						isFutureLease: false,
						isEviction: false
					}
				},

				// get associated tenant
				{
					$lookup: {
						from: COLLECTIONS.users,
						localField: REFERENCE.tenant,
						foreignField: "_id",
						as: "tenantData"
					}
				},
				{ $unwind: "$tenantData" },

				// project stage
				{
					$project: {
						_id: 1,
						tenant: 1,
						unit: 1,
						property: 1,
						company: 1,

						// aggregated fields
						tenantData: {
							name: "$tenantData.name",
							email: "$tenantData.email"
						}
					}
				}
			]).exec();
			if (!res) {
				throw new BadRequestException("Invalid request");
			}


			// Update property
			const propertyUpdateResult = await this.propertyModel.updateOne(
				{ _id: res.property },
				{ $inc: { occupiedUnits: -1 } },
				{ session }
			);
			if (propertyUpdateResult.modifiedCount === 0) {
				throw new BadRequestException("Failed to update property");
			}

			// Update unit
			const unitUpdateResult = await this.unitModel.updateOne(
				{ _id: res.unit },
				{
					$set: {
						isOccupied: false,
						lease: null,
						tenant: null
					},
					$push: {
						leaseHistories: res._id,
					}
				},
				{ session }
			);
			if (unitUpdateResult.modifiedCount === 0) {
				throw new BadRequestException("Failed to update unit");
			}

			// Remove tenant
			const tenantDeleteResult = await this.userModel.deleteOne(
				{ _id: res.tenant },
				{ session }
			);
			if (tenantDeleteResult.deletedCount === 0) {
				throw new BadRequestException("Failed to delete tenant");
			}

			// Update company to remove tenant
			const companyUpdateResult = await this.companyModel.updateOne(
				{ _id: res.company },
				{
					$pull: {
						users: res.tenant,
					}
				},
				{ session }
			);
			if (companyUpdateResult.modifiedCount === 0) {
				throw new BadRequestException("Failed to update company");
			}

			// update lease to make it inactive
			const savedLease = await this.leaseModel.findOneAndUpdate(
				{ _id: res._id },
				{
					$set: {
						isClosed: true,
						status: LeaseStatus.INACTIVE,
						tenant: null,
						tenantRecord: {
							name: res?.tenantData?.name,
							email: res?.tenantData?.email
						}
					},
				},
				{ session }
			);

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}

	}

	// cancel move in for future tenant
	async cancelMoveIn(leaseId: string, user: IFullUser) {

		// Start a session
		const session = await this.connection.startSession();
		try {
			// Start transaction
			session.startTransaction();

			const [res] = await this.leaseModel.aggregate([
				{
					$match: {
						_id: new mongoose.Types.ObjectId(leaseId),
						company: new mongoose.Types.ObjectId(user?.company),
						isClosed: false,
						isFutureLease: true
					}
				},

				// project stage
				{
					$project: {
						_id: 1,
						tenant: 1,
						unit: 1,
						property: 1,
						company: 1,
					}
				}
			]).exec();
			if (!res) {
				throw new BadRequestException("Invalid request");
			}

			// Remove rents
			const rentDeleteResult = await this.rentModel.deleteMany(
				{ lease: new mongoose.Types.ObjectId(leaseId) },
				{ session }
			);
			if (rentDeleteResult.deletedCount === 0) {
				throw new BadRequestException("No rents were deleted for this lease.");
			}

			// Update unit
			const unitUpdateResult = await this.unitModel.updateOne(
				{ _id: res.unit },
				{
					$pull: {
						futureLeases: new mongoose.Types.ObjectId(leaseId),
					}
				},
				{ session }
			);
			if (unitUpdateResult.modifiedCount === 0) {
				throw new BadRequestException("Failed to update unit");
			}

			// Remove tenant
			const tenantDeleteResult = await this.userModel.deleteOne(
				{ _id: res.tenant },
				{ session }
			);
			if (tenantDeleteResult.deletedCount === 0) {
				throw new BadRequestException("Failed to delete tenant");
			}

			// Update company to remove tenant
			const companyUpdateResult = await this.companyModel.updateOne(
				{ _id: res.company },
				{
					$pull: {
						users: res.tenant,
					}
				},
				{ session }
			);
			if (companyUpdateResult.modifiedCount === 0) {
				throw new BadRequestException("Failed to update company");
			}

			// Remove lease
			const leaseDeleteResult = await this.leaseModel.deleteOne(
				{ _id: new mongoose.Types.ObjectId(leaseId) },
				{ session }
			);
			if (leaseDeleteResult.deletedCount === 0) {
				throw new BadRequestException("Failed to delete lease");
			}

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}

interface IGetLeases {
	propertyId: string | Types.ObjectId;
	unitId: string | Types.ObjectId;
	name: string;
	email: string;
	isFutureLease: boolean;
	fromStart: string;
	toStart: string;
	fromEnd: string;
	toEnd: string;
	sortBy: string;
	sortOrder: number;
}