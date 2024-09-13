import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, mongo } from 'mongoose';
import { Company } from 'src/modules/company/company.model';
import { Ledger } from 'src/modules/lease/lease-ledger.model';
import { Rent } from 'src/modules/lease/lease-rent.model';
import { Lease } from 'src/modules/lease/lease.model';
import { Property } from 'src/modules/property/property.model';
import { Prospect } from 'src/modules/prospect/prospect.model';
import { Unit } from 'src/modules/unit/unit.model';
import { User } from 'src/modules/users/users.model';
import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from 'src/common/config/timezone.config';
import { COLLECTIONS, REFERENCE } from 'src/common/config/consts';
import { IFullUser } from 'src/modules/users/users.interface';

@Injectable()
export class ReportsService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Prospect.name) private readonly prospectModel: Model<Prospect>,
		@InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
		@InjectModel(Rent.name) private readonly rentModel: Model<Rent>,
		@InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
	) { }

	async getVacancyReport(payload: {
		propertyId: string,
		isOccupied: boolean
	}, user: IFullUser) {

		const { isOccupied, propertyId } = payload;

		const date30DaysAgo = moment.tz(DEFAULT_TIMEZONE).subtract(30, 'days').format('YYYY-MM-DD');
		const date60DaysForward = moment.tz(DEFAULT_TIMEZONE).add(60, 'days').format('YYYY-MM-DD');

		// for future leases
		const futureLeaseLookup = [

			// future tenant calculation
			{
				$lookup: {
					from: COLLECTIONS.leases,
					localField: "units.futureLeases",
					foreignField: "_id",
					as: "futureLeases"
				}
			},
			{
				$unwind: {
					path: "$futureLeases",
					preserveNullAndEmptyArrays: true
				}
			},
			{ $sort: { "futureLeases.leaseStart": 1 } },

			// future tenant info
			{
				$lookup: {
					from: COLLECTIONS.users,
					localField: "futureLeases.tenant",
					foreignField: "_id",
					as: "futureTenants"
				}
			},
			{
				$unwind: {
					path: "$futureTenants",
					preserveNullAndEmptyArrays: true
				}
			},
		];

		const futureLeaseStage = {
			// future lease and tenant
			futureTenant: {
				$cond: {
					if: { $ne: ["$futureLeases", null] },
					then: {
						_id: { $toString: "$futureLeases._id" },
						leaseStart: "$futureLeases.leaseStart",
						leaseEnd: "$futureLeases.leaseEnd",
						tenant: {
							_id: { $toString: "$futureTenants._id" },
							name: "$futureTenants.name",
							email: "$futureTenants.email"
						},
					},
					else: null
				}
			}
		}

		// for active leases
		const activeLeaseLookup = [

			// active lease info
			{
				$lookup: {
					from: COLLECTIONS.leases,
					localField: "units.lease",
					foreignField: "_id",
					as: "activeLease"
				}
			},
			{
				$unwind: {
					path: "$activeLease",
					preserveNullAndEmptyArrays: true
				}
			},

			// active tenant info
			{
				$lookup: {
					from: COLLECTIONS.users,
					localField: "activeLease.tenant",
					foreignField: "_id",
					as: "activeTenant"
				}
			},
			{
				$unwind: {
					path: "$activeTenant",
					preserveNullAndEmptyArrays: true
				}
			}
		];

		const activeLeaseStage = {
			// active lease and tenant
			activeLease: {
				$cond: {
					if: { $ne: ["$activeLease", null] },
					then: {
						_id: { $toString: "$activeLease._id" },
						leaseStart: "$activeLease.leaseStart",
						leaseEnd: "$activeLease.leaseEnd",
						tenant: {
							_id: { $toString: "$activeTenant._id" },
							name: "$activeTenant.name",
							email: "$activeTenant.email"
						},
					},
					else: null
				}
			}
		}

		// expiring lease calculation for each property
		// lease start > 30 days ago and lease end < 60 days forward
		const moveOutPipeLine = [
			{
				$lookup: {
					from: COLLECTIONS.leases,
					localField: "_id",
					foreignField: REFERENCE.property,
					as: "leases"
				}
			},
			{
				$addFields: {
					expiringLeaseCount: {
						$cond: {
							if: { $eq: [{ $size: "$leases" }, 0] },
							then: 0,
							else: {
								$size: {
									$filter: {
										input: "$leases",
										as: "leases",
										cond: {
											$and: [
												{ $gte: ["$$leases.leaseEnd", date30DaysAgo] },
												{ $lte: ["$$leases.leaseEnd", date60DaysForward] },
												{ $eq: ["$$leases.isFutureLease", false] },
												{ $eq: ["$$leases.isClosed", false] },
											],
										},
									},
								},
							},
						},
					},
				},
			}
		]

		const pipeLine: any = [
			{
				$match: {
					company: new mongoose.Types.ObjectId(user?.company),
					...(propertyId && { _id: new mongoose.Types.ObjectId(propertyId) })
				}
			},

			// Move out calculation for each property
			...moveOutPipeLine,

			// units lookup
			{
				$lookup: {
					from: COLLECTIONS.units,
					localField: "_id",
					foreignField: REFERENCE.property,
					as: "units"
				}
			},
			{
				$unwind: {
					path: "$units",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$match: {
					"units.isOccupied": isOccupied
				}
			},

			// turn over calculation
			{
				$addFields: {
					pastLeaseId: {
						$arrayElemAt: ["$units.leaseHistories", -1]
					}
				}
			},

			// date vacated calculation
			{
				$lookup: {
					from: COLLECTIONS.leases,
					localField: "pastLeaseId",
					foreignField: "_id",
					as: "pastLease"
				}
			},
			{
				$addFields: {
					dateVacated: {
						$cond: {
							if: { $ne: ["$pastLease", []] },
							then: {
								leaseStart: { $arrayElemAt: ["$pastLease.leaseStart", 0] },
								leaseEnd: { $arrayElemAt: ["$pastLease.leaseEnd", 0] }
							},
							else: null
						}
					}
				}
			},

			// based on the isOccupied value, we will add the stages, either active tenant or future tenant
			...(isOccupied ? activeLeaseLookup : futureLeaseLookup),

			// group stage for unit 
			{
				$group: {
					_id: {
						propertyId: { $toString: "$_id" },
						address: "$address",
					},
					expiringLeaseCount: { $first: "$expiringLeaseCount" },
					units: {
						$push: {
							_id: { $toString: "$units._id" },
							unitNumber: "$units.unitNumber",
							squareFeet: "$units.squareFeet",
							marketRent: "$units.marketRent",
							turnOver: "$turnOver",
							dateVacated: "$dateVacated",

							// either active tenant or future tenant
							...(isOccupied ? activeLeaseStage : futureLeaseStage)
						},
					},
				}
			},

			// group stage for property
			{
				$group: {
					_id: null,
					properties: {
						$push: {
							propertyId: { $toString: "$_id.propertyId" },
							address: "$_id.address",
							units: "$units",
							expiringLeaseCount: "$expiringLeaseCount",
						}
					}
				}
			},

			// project stage
			{
				$project: {
					_id: 0,
					properties: 1,
				}
			}
		]
		const totalMoveOut_PipeLine = [
			{
				$match: {
					company: new mongoose.Types.ObjectId(user?.company),
					...(propertyId && { _id: new mongoose.Types.ObjectId(propertyId) })
				}
			},
			...moveOutPipeLine,
			{
				$group: {
					_id: null,
					totalMoveOutCount: {
						$sum: "$expiringLeaseCount"
					}
				}
			},
			{
				$project: {
					_id: 0,
					totalMoveOutCount: 1
				}
			}
		]

		const unitSummary_PipeLine = [
			// unit summary pipeline
			// this pipeline is used to get total occupied and vacant unit number
			{
				$match: {
					companyId: new mongoose.Types.ObjectId(user?.company),
					...(propertyId && { _id: new mongoose.Types.ObjectId(propertyId) })
				}
			},
			{
				$lookup: {
					from: COLLECTIONS.units,
					localField: "_id",
					foreignField: REFERENCE.property,
					as: "units"
				}
			},
			{
				$unwind: {
					path: "$units",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$group: {
					_id: {
						propertyId: { $toString: "$_id" },
						address: "$address",
					},
					occupiedUnit: {
						$sum: {
							$cond: [{ $eq: ["$units.isOccupied", true] }, 1, 0]
						}
					},
					vacantUnit: {
						$sum: {
							$cond: [{ $eq: ["$units.isOccupied", false] }, 1, 0]
						}
					}
				}
			},
			{
				$group: {
					_id: null,
					totalOccupied: { $sum: "$occupiedUnit" },
					totalVacant: { $sum: "$vacantUnit" }
				}
			},
			{
				$project: {
					_id: 0
				}
			}
		]

		const [[res], [totalMoveOut], [summary]]: any = await Promise.all([
			await this.propertyModel.aggregate(pipeLine).exec(),
			await this.propertyModel.aggregate(totalMoveOut_PipeLine).exec(),
			await this.propertyModel.aggregate(unitSummary_PipeLine).exec()
		])

		const properties = [];

		for (const property of res?.properties) {

			const units = [];
			for (const unit of property?.units) {

				// if unit exist in units array, then continue
				const unitExists = units.some(data => data?._id === unit?._id);
				if (unitExists) continue;

				units.push(unit);
			}

			properties.push({
				propertyId: property?.propertyId,
				address: property?.address,
				expiringLeaseCount: property?.expiringLeaseCount,
				units: units,
			})
		}

		return {
			properties: properties || [],
			totalMoveOutCount: totalMoveOut?.totalMoveOutCount || 0,
			totalOccupied: summary?.totalOccupied || 0,
			totalVacant: summary?.totalVacant || 0,
			totaUnit: summary?.totalOccupied + summary?.totalVacant || 0
		}
	}

	async getVacancyReport_v2(payload: {
		propertyId: string,
		isOccupied: boolean
	}, user: IFullUser) {

		const { isOccupied, propertyId } = payload;

		const date30DaysAgo = moment.tz(DEFAULT_TIMEZONE).subtract(30, 'days').format('YYYY-MM-DD');
		const date60DaysForward = moment.tz(DEFAULT_TIMEZONE).add(60, 'days').format('YYYY-MM-DD');

		// Combined Lookup for both Active and Future Leases
		const leaseLookupStage = [
			{
				$lookup: {
					from: COLLECTIONS.leases,
					let: {
						unitLeaseId: "$unitData.lease",
						futureLeaseIds: "$unitData.futureLeases"
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$or: [
										{ $eq: ["$_id", "$$unitLeaseId"] },
										{ $in: ["$_id", "$$futureLeaseIds"] }
									]
								}
							}
						}
					],
					as: "leases"
				}
			},
			{ $unwind: { path: "$leases", preserveNullAndEmptyArrays: true } }
		];

		// Lookup for Tenants related to the Leases
		const tenantLookupStage = [
			{
				$lookup: {
					from: COLLECTIONS.users,
					let: { tenantId: "$leases.tenant" },
					pipeline: [
						{
							$match:
							{
								$expr:
								{
									$eq: [
										"$_id", "$$tenantId"
									]
								}
							}
						},
						{ $project: { _id: 1, name: 1, email: 1 } }
					],
					as: "tenant"
				}
			},
			{ $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } }
		];

		// For Expiring Leases (Move Out)
		const moveOutPipeline = [
			{
				$addFields: {
					expiringLeaseCount: {
						$size: {
							$filter: {
								input: {
									$cond: {
										if: { $eq: [{ $type: "$leases" }, "array"] },
										then: "$leases",
										else: ["$leases"]
									}
								},
								as: "lease",
								cond: {
									$and: [
										{ $gte: ["$$lease.leaseEnd", date30DaysAgo] },
										{ $lte: ["$$lease.leaseEnd", date60DaysForward] },
										{ $eq: ["$$lease.isFutureLease", false] },
										{ $eq: ["$$lease.isClosed", false] }
									]
								}
							}
						}
					}
				}
			}
		];

		// Combined pipeline for the main query
		const pipeLine: any = [
			{
				$match: {
					company: new mongoose.Types.ObjectId(user?.company),
					...(propertyId && { _id: new mongoose.Types.ObjectId(propertyId) })
				}
			},

			// Lookup for Units
			{
				$lookup: {
					from: COLLECTIONS.units,
					localField: "_id",
					foreignField: REFERENCE.property,
					as: "unitData"
				}
			},
			{ $unwind: { path: "$unitData", preserveNullAndEmptyArrays: true } },
			{
				$match: { "unitData.isOccupied": isOccupied }
			},

			// Lease and Tenant Lookup Stages (combined once)
			...leaseLookupStage,
			...tenantLookupStage,

			// Move Out Pipeline
			...moveOutPipeline,

			// Group by Property and Units
			{
				$group: {
					_id: { propertyId: { $toString: "$_id" }, address: "$address" },
					expiringLeaseCount: { $first: "$expiringLeaseCount" },
					occupiedUnits: {
						$sum: {
							$cond: [{ $eq: ["$unitData.isOccupied", true] }, 1, 0]
						}
					},
					vacantUnits: {
						$sum: {
							$cond: [{ $eq: ["$unitData.isOccupied", false] }, 1, 0]
						}
					},
					unitsCount: { $sum: { $size: "$units" } },
					units: {
						$push: {
							_id: { $toString: "$unitData._id" },
							unitNumber: "$unitData.unitNumber",
							squareFeet: "$unitData.squareFeet",
							marketRent: "$unitData.marketRent",
							tenant: {
								_id: { $toString: "$tenant._id" },
								name: "$tenant.name",
								email: "$tenant.email"
							},
							leaseStart: "$leases.leaseStart",
							leaseEnd: "$leases.leaseEnd",
							isFutureLease: "$leases.isFutureLease"
						}
					}
				}
			},

			// Group by Overall Properties
			{
				$group: {
					_id: null,
					properties: {
						$push: {
							propertyId: "$_id.propertyId",
							address: "$_id.address",
							units: "$units",
							expiringLeaseCount: "$expiringLeaseCount",
							occupiedUnits: "$occupiedUnits",
							vacantUnits: "$vacantUnits",
							unitsCount: "$unitsCount"
						}
					},
					totalMoveOutCount: { $sum: "$expiringLeaseCount" },
					totalOccupied: { $sum: "$occupiedUnits" },
					totalVacant: { $sum: "$vacantUnits" },
					totalUnits: { $sum: "$unitsCount" }
				}
			},

			// Project to Remove _id
			{
				$project: {
					_id: 0,
					properties: 1,
					totalMoveOutCount: 1,
					totalOccupied: 1,
					totalVacant: 1,
					totalUnits: 1
				}
			}
		];

		const [res]: any = await this.propertyModel.aggregate(pipeLine).exec();
		console.log(res);
		// return res
		let totalOccupied = 0, totalVacant = 0;

		const properties = res?.properties.map((property) => {
			const uniqueUnitsMap = new Map();

			property?.units.forEach((unit) => {
				if (!uniqueUnitsMap.has(unit?._id)) {
					uniqueUnitsMap.set(unit?._id, unit);
				}
			});

			totalOccupied += !isOccupied ? (property?.unitsCount - property?.vacantUnits) : 0;
			totalVacant += isOccupied ? (property?.unitsCount - property?.occupiedUnits) : 0;

			return {
				...property,

				occupiedUnits: !isOccupied ? (property?.unitsCount - property?.vacantUnits) : property?.occupiedUnits,

				vacantUnits: isOccupied ? (property?.unitsCount - property?.occupiedUnits) : property?.vacantUnits,

				units: Array.from(uniqueUnitsMap.values()),
			};
		});

		return {
			properties: properties || [],
			totalMoveOutCount: res?.totalMoveOutCount || 0,
			totalOccupied: totalOccupied || 0,
			totalVacant: totalVacant || 0,
			totalUnits: res?.totalUnits || 0,
		};

	}
}
