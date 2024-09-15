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
			{ $match: { "unitData.isOccupied": isOccupied } },

			// Lease and Tenant Lookup Stages (combined once)
			...leaseLookupStage,
			...tenantLookupStage,

			// Move Out Pipeline
			...moveOutPipeline,

			// // Group by Property and Units
			{
				$group: {
					_id: { propertyId: { $toString: "$_id" }, address: "$address" },
					expiringLeaseCount: { $first: "$expiringLeaseCount" },
					occupiedUnits: { $first: "$occupiedUnits" },
					unitsCount: { $sum: { $size: "$units" } },
					vacantUnits: {
						$sum: {
							$cond: [{ $eq: ["$unitData.isOccupied", false] }, 1, 0]
						}
					},
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

			// // Group by Overall Properties
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

			// // Project to Remove _id
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

	async getRentReport(filter: {
		propertyId: string
		from: string
		to: string
	}, user: IFullUser) {

		const { propertyId, from, to } = filter;

		let fromDate = from;
		let toDate = to;

		const pipeLine = [
			{
				$match: {
					company: new mongoose.Types.ObjectId(user?.company),
					// status: { $ne: "pending" }, // Exclude pending leases
					// isFutureLease: false,
					...(propertyId && { property: new mongoose.Types.ObjectId(propertyId) }),
				}
			},

			// Property lookup
			{
				$lookup: {
					from: COLLECTIONS.properties,
					localField: REFERENCE.property,
					foreignField: "_id",
					as: "property"
				}
			},
			{
				$unwind: {
					path: "$property",
					preserveNullAndEmptyArrays: true
				}
			},

			// Unit lookup
			{
				$lookup: {
					from: COLLECTIONS.units,
					localField: REFERENCE.unit,
					foreignField: "_id",
					as: "unit"
				}
			},
			{
				$unwind: {
					path: "$unit",
					preserveNullAndEmptyArrays: true
				}
			},

			// Active tenants' info lookup
			{
				$lookup: {
					from: COLLECTIONS.users,
					localField: REFERENCE.tenant,
					foreignField: "_id",
					as: "tenant"
				}
			},
			{
				$unwind: {
					path: "$tenant",
					preserveNullAndEmptyArrays: true
				}
			},

			// Rent charges lookup
			{
				$lookup: {
					from: COLLECTIONS.rents,
					localField: REFERENCE.rents,
					foreignField: "_id",
					as: "rents"
				}
			},

			// Ledger lookup
			{
				$lookup: {
					from: COLLECTIONS.ledgers,
					localField: REFERENCE.ledgers,
					foreignField: "_id",
					as: "ledgers"
				}
			},

			// Incomes lookup with last payment information
			{
				$lookup: {
					from: COLLECTIONS.incomes,
					localField: "_id",
					foreignField: REFERENCE.lease,
					as: "incomes"
				}
			},
			{
				$addFields: {
					lastPayment: {
						$let: {
							vars: {
								filteredIncomes: { $ifNull: ["$incomes", []] },
								maxPaymentDate: { $max: "$incomes.paymentDay" }
							},
							in: {
								paymentDay: "$$maxPaymentDate",
								totalAmount: {
									$sum: {
										$map: {
											input: "$$filteredIncomes",
											as: "income",
											in: {
												$cond: [
													{ $eq: ["$$income.paymentDay", "$$maxPaymentDate"] },
													"$$income.amount",
													0
												]
											}
										}
									}
								}
							}
						}
					}
				}
			},

			// Add fields for ledger and rent calculation
			{
				$addFields: {
					totalMonthly: {
						$sum: {
							$map: {
								input: {
									$filter: {
										input: "$rents",
										as: "rent",
										cond: { $eq: ["$$rent.frequency", "monthly"] }
									}
								},
								as: "rent",
								in: "$$rent.amount"
							}
						}
					},

					// Filter and map ledger entries within the date range (if provided)
					...((from && to) && {
						ledgers: {
							$map: {
								input: {
									$filter: {
										input: "$ledgers",
										as: "ledgerItem",
										cond: {
											$and: [
												{ $gte: ["$$ledgerItem.paymentDay", fromDate] },
												{ $lte: ["$$ledgerItem.paymentDay", toDate] }
											]
										}
									}
								},
								as: "ledgerItem",
								in: {
									description: "$$ledgerItem.description",
									amount: "$$ledgerItem.amount",
									balance: "$$ledgerItem.balance",
									paymentDay: "$$ledgerItem.paymentDay",
									paymentDate: "$$ledgerItem.paymentDate"
								}
							}
						}
					})
				}
			},

			// Summing amounts and balances
			{
				$addFields: {
					totalAnnually: { $multiply: ["$totalMonthly", 12] },
					totalAmount: {
						$ifNull: [
							{ $round: [{ $sum: "$ledgers.amount" }, 2] },
							0
						]
					},
					totalBalance: {
						$ifNull: [
							{ $round: [{ $sum: "$ledgers.balance" }, 2] },
							0
						]
					}
				}
			},

			// calculation for collected amount
			{
				$addFields: {
					collectedAmount: {
						$round: [
							{ $subtract: ["$totalAmount", "$totalBalance"] }, 2
						]
					}
				}
			},

			// Calculate net values
			{
				$addFields: {
					netCollected: { $round: [{ $sum: "$collectedAmount" }, 2] },
					netMonthly: { $round: [{ $sum: "$totalMonthly" }, 2] },
					netAnnually: { $round: [{ $sum: "$totalAnnually" }, 2] },
					netAmount: { $round: [{ $sum: "$totalAmount" }, 2] },
					netBalance: { $round: [{ $sum: "$totalBalance" }, 2] }
				}
			},

			// Group by unit and property
			{
				$group: {
					_id: {
						propertyId: "$property._id",
						address: "$property.address",
						unitId: "$unit._id",
						unitNumber: "$unit.unitNumber",
						occupied: "$unit.occupied"
					},
					netCollected: { $sum: "$netCollected" },
					netMonthly: { $sum: "$netMonthly" },
					netAnnually: { $sum: "$netAnnually" },
					netAmount: { $sum: "$netAmount" },
					netBalance: { $sum: "$netBalance" },
					netIncome: { $sum: "$netIncome" },
					lease: {
						$push: {
							_id: "$_id",
							leaseStart: "$leaseStart",
							leaseEnd: "$leaseEnd",
							status: "$status",
							isClosed: "$isClosed",
							isEviction: "$isEviction",
							isFutureLease: "$isFutureLease",

							lastPayment: "$lastPayment",

							collectedAmount: "$collectedAmount",
							totalAmount: "$totalAmount",
							totalBalance: "$totalBalance",
							totalMonthly: "$totalMonthly",
							totalAnnually: "$totalAnnually",

							tenant: {
								_id: "$tenant._id",
								name: "$tenant.name",
								email: "$tenant.email"
							}
						}
					}
				}
			},

			// Group by property
			{
				$group: {
					_id: {
						propertyId: "$_id.propertyId",
						address: "$_id.address"
					},
					netCollected: { $sum: "$netCollected" },
					netMonthly: { $sum: "$netMonthly" },
					netAnnually: { $sum: "$netAnnually" },
					netAmount: { $sum: "$netAmount" },
					netBalance: { $sum: "$netBalance" },
					units: {
						$push: {
							_id: "$_id.unitId",
							unitNumber: "$_id.unitNumber",
							occupied: "$_id.occupied",
							lease: "$lease",
						}
					}
				}
			},

			// Final grouping and summing all properties
			{
				$group: {
					_id: null,
					properties: {
						$push: {
							propertyId: "$_id.propertyId",
							address: "$_id.address",
							units: "$units"
						}
					},
					netCollected: { $sum: "$netCollected" },
					netMonthly: { $sum: "$netMonthly" },
					netAnnually: { $sum: "$netAnnually" },
					netAmount: { $sum: "$netAmount" },
					netBalance: { $sum: "$netBalance" }
				}
			}
		];

		const [res] = await this.leaseModel.aggregate(pipeLine).exec();
		return {
			properties: res?.properties || [],
			netCollected: res?.netCollected || 0,
			netMonthly: res?.netMonthly || 0,
			netAnnually: res?.netAnnually || 0,
			netAmount: res?.netAmount || 0,
			netBalance: res?.netBalance || 0
		}
	}
}
