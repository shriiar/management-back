import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { COLLECTIONS, REFERENCE } from 'src/common/config/consts';
import { DEFAULT_TIMEZONE } from 'src/common/config/timezone.config';
import { Company } from 'src/modules/company/company.model';
import { Ledger } from 'src/modules/lease/lease-ledger.model';
import { Rent } from 'src/modules/lease/lease-rent.model';
import { Lease } from 'src/modules/lease/lease.model';
import { Property } from 'src/modules/property/property.model';
import { Unit } from 'src/modules/unit/unit.model';
import { User } from 'src/modules/users/users.model';
import { getDaysAgo, getDaysAhead } from 'src/utils/dateSchedule.utils';

@Injectable()
export class CronLeaseService {
	logger: any;

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
		@InjectModel(Rent.name) private readonly rentModel: Model<Rent>,
		@InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
	) { }

	// async onModuleInit() {
	// 	await this.checkUpcomingPayments();
	// 	await this.checkExpiredLease();
	// 	await this.checkUpcomingFutureMoveIns();
	// 	await this.checkUnpaidLedger();
	// }

	@Cron(CronExpression.EVERY_DAY_AT_6AM, {
		timeZone: DEFAULT_TIMEZONE,
	})
	async handleCorn() {
		await this.checkUpcomingPayments();
		await this.checkExpiredLease();
		await this.checkUpcomingFutureMoveIns();
		await this.checkUnpaidLedger();
	}

	// for Tenant (send out notifications/emails to tenant regarding upcoming payments)
	async checkUpcomingPayments(): Promise<void> {
		try {
			const dates = []
			dates.push(getDaysAhead(7));
			dates.push(getDaysAhead(3));
			dates.push(getDaysAhead(0));

			const res: any = await this.leaseModel.aggregate([
				{
					$match: {
						isClosed: false,
						isFutureLease: false,
					}
				},

				// get associated ledger for the lease
				{
					$lookup: {
						from: COLLECTIONS.ledgers,
						localField: '_id',
						foreignField: 'lease',
						as: 'ledgers',
					},
				},
				{
					$addFields: {
						ledgers: {
							$map: {
								input: {
									$filter: {
										input: "$ledgers",
										as: "ledger",
										cond: {
											$and: [
												{ $eq: ["$$ledger.isPaid", false] },
												{ $in: ["$$ledger.paymentDay", dates] },
											]
										}
									}
								},
								as: "ledger",
								in: {
									_id: "$$ledger._id",
									paymentDay: "$$ledger.paymentDay",
									description: "$$ledger.description",
									amount: "$$ledger.amount",
									balance: "$$ledger.balance",
								}
							}
						}
					}
				},

				// get associated tenant
				{
					$lookup: {
						from: COLLECTIONS.users,
						localField: REFERENCE.tenant,
						foreignField: '_id',
						as: 'tenant',
					}
				},
				{
					$unwind: {
						path: '$tenant',
						preserveNullAndEmptyArrays: true
					}
				},

				// get associated unit
				{
					$lookup: {
						from: COLLECTIONS.units,
						localField: REFERENCE.unit,
						foreignField: '_id',
						as: 'unit',
					}
				},
				{
					$unwind: {
						path: '$unit',
						preserveNullAndEmptyArrays: true
					}
				},

				// get associated property
				{
					$lookup: {
						from: COLLECTIONS.properties,
						localField: REFERENCE.property,
						foreignField: '_id',
						as: 'property',
					}
				},
				{
					$unwind: {
						path: '$property',
						preserveNullAndEmptyArrays: true
					}
				},

				// project stage
				{
					$project: {
						_id: 1,
						leaseStart: 1,
						leaseEnd: 1,

						// aggregated data
						ledgers: 1,
						property: {
							_id: "$property._id",
							address: "$property.address"
						},
						unit: {
							_id: "$unit._id",
							unitNumber: "$unit.unitNumber"
						},
						tenant: {
							_id: "$tenant._id",
							name: "$tenant.name",
							email: "$tenant.email",
						}
					}
				}
			]).exec();
			if (!res?.length) return;

			for (const lease of res) {

				if (!lease?.ledgers.length) {
					return;
				}

				let message = `
Dear ${lease?.tenant?.name},
			
We hope this message finds you well. This notice is regarding your residence at ${lease?.property?.address}, unit ${lease?.unit?.unitNumber}, where you are currently living.
			
			`;

				// Group ledger payments into a single sentence
				if (lease?.ledgers.length > 0) {
					const paymentDetails = lease.ledgers.map(ledger => {
						return `${ledger?.description} due on ${ledger.paymentDay}`;
					}).join(', ');

					message += `
Please be advised that you have the following upcoming payment(s): ${paymentDetails}.`;
				}

				message += `
If you have any questions or require further assistance, please feel free to contact us.
`;

				console.log(message);
			}
		}
		catch (error) {
			this.logger.error(error);
		}
	}

	// Find lease's that should have been already expired but still not ended yet
	// for Manager's (send out notifications/emails to manager's regarding expired lease's)
	async checkExpiredLease(): Promise<void> {

		try {
			// current date
			const today = getDaysAhead(0);

			const [res, managerRes] = await Promise.all([
				this.leaseModel.aggregate([
					{
						$match: {
							// lease end must be in the past
							leaseEnd: { $lt: today },

							// exclude inactive / terminated /pending
							status: { $nin: ['inactive', 'terminated', 'pending'] },
							isClosed: false
						}
					},

					// get associated property
					{
						$lookup: {
							from: COLLECTIONS.properties,
							localField: REFERENCE.property,
							foreignField: '_id',
							as: 'property',
						}
					},
					{
						$unwind: {
							path: "$property",
							preserveNullAndEmptyArrays: true
						}
					},

					// get associated unit
					{
						$lookup: {
							from: COLLECTIONS.units,
							localField: REFERENCE.unit,
							foreignField: '_id',
							as: 'unit',
						}
					},
					{
						$unwind: {
							path: "$unit",
							preserveNullAndEmptyArrays: true
						}
					},

					// project stage
					{
						$project: {
							_id: { $toString: "$_id" },
							leaseStart: 1,
							leaseEnd: 1,
							company: { $toString: "$company" },

							// aggregated fields
							unit: {
								_id: { $toString: "$unit._id" },
								unitNumber: "$unit.unitNumber"
							},
							property: {
								_id: { $toString: "$property._id" },
								address: "$property.address"
							}
						}
					}
				]).exec(),

				this.getManagers()
			]);
			if (!res.length) return;

			for (const lease of res) {

				for (const manager of managerRes) {

					// push alerts to specific company pm
					if (manager.company === lease.company) {

						const message = `
An expired lease needs your attention.

The lease is for the property at ${lease?.property?.address} in unit ${lease?.unit?.unitNumber}.
The lease end date was ${lease?.leaseEnd}, but today is ${today}. The lease should have been expired by now.
`;

						console.log(message);
					}
				}
			}
		}
		catch (error) {
			this.logger.error(error);
		}
	}

	// Find future tenant's that should have been started by now but hasn't
	// for Manager's (send out notifications/emails to manager's regarding future lease's)
	async checkPastFutureMoveIns(): Promise<void> {
		try {

			// current date
			const today = getDaysAhead(0);

			const [res, managerRes] = await Promise.all([
				this.leaseModel.aggregate([
					{
						$match: {
							// lease start must be in the past
							leaseStart: { $lt: today },
							'status': 'pending',
							isClosed: false,
							isFutureLease: true,
						}
					},

					// get associated property
					{
						$lookup: {
							from: COLLECTIONS.properties,
							localField: REFERENCE.property,
							foreignField: '_id',
							as: 'property',
						}
					},
					{
						$unwind: {
							path: "$property",
							preserveNullAndEmptyArrays: true
						}
					},

					// get associated unit
					{
						$lookup: {
							from: COLLECTIONS.units,
							localField: REFERENCE.unit,
							foreignField: '_id',
							as: 'unit',
						}
					},
					{
						$unwind: {
							path: "$unit",
							preserveNullAndEmptyArrays: true
						}
					},

					// project stage
					{
						$project: {
							_id: { $toString: "$_id" },
							leaseStart: 1,
							leaseEnd: 1,
							company: { $toString: "$company" },

							// aggregated fields
							unit: {
								_id: { $toString: "$unit._id" },
								unitNumber: "$unit.unitNumber"
							},
							property: {
								_id: { $toString: "$property._id" },
								address: "$property.address"
							},
						}
					}
				]).exec(),

				this.getManagers()
			])
			if (!res.length) return;

			for (const lease of res) {

				for (const manager of managerRes) {

					if (manager.company === lease.company) {

						const message = `
An upcoming lease requires action.

The lease is for the property at ${lease?.property?.address} in unit ${lease?.unit?.unitNumber}.
The lease start date was ${lease?.leaseStart}, but today is ${today}. The lease should have been active by now.
`;

						console.log(message);
					}
				}
			}

		} catch (error) {
			this.logger.error(error);
		}
	}

	// Find future tenant's whose start date in in 17 7 1 or today date
	// for Manager's (send out notifications/emails to manager's regarding future lease's)
	async checkUpcomingFutureMoveIns(): Promise<void> {
		try {

			const dates = [];
			dates.push(getDaysAhead(14));
			dates.push(getDaysAhead(7));
			dates.push(getDaysAhead(1));
			dates.push(getDaysAhead(0));

			console.log(dates);

			const [res, managerRes] = await Promise.all([
				this.leaseModel.aggregate([
					{
						$match: {
							// lease start must be in the given dates
							leaseStart: { $in: dates },
							'status': 'pending',
							isClosed: false,
							isFutureLease: true,
						}
					},

					// get associated property
					{
						$lookup: {
							from: COLLECTIONS.properties,
							localField: REFERENCE.property,
							foreignField: '_id',
							as: 'property',
						}
					},
					{
						$unwind: {
							path: "$property",
							preserveNullAndEmptyArrays: true
						}
					},

					// get associated unit
					{
						$lookup: {
							from: COLLECTIONS.units,
							localField: REFERENCE.unit,
							foreignField: '_id',
							as: 'unit',
						}
					},
					{
						$unwind: {
							path: "$unit",
							preserveNullAndEmptyArrays: true
						}
					},

					// project stage
					{
						$project: {
							_id: { $toString: "$_id" },
							leaseStart: 1,
							leaseEnd: 1,
							company: { $toString: "$company" },

							// aggregated fields
							property: {
								_id: { $toString: '$property._id' },
								address: '$property.address'
							},
							unit: {
								_id: { $toString: '$unit._id' },
								unitNumber: '$unit.unitNumber'
							}
						}
					}
				]).exec(),

				this.getManagers()
			])
			if (!res.length) return;

			for (const lease of res) {

				for (const manager of managerRes) {

					if (manager.company === lease.company) {

						const message = `
A future lease is starting soon!

The lease is for the property at ${lease?.property?.address} in unit ${lease?.unit?.unitNumber}.
The lease will start on ${lease?.leaseStart}.
`;

						console.log(message);
					}
				}
			}
		}
		catch (error) {
			this.logger.error(error);
		}
	}

	// Find all tenants unpaid ledger in in -7 -3 -1 or today date
	// for Managers & Tenants (send out notifications/emails to manager's/tenant's regarding unpaid ledger's)
	async checkUnpaidLedger(): Promise<void> {
		try {

			const dates = [];
			dates.push(getDaysAgo(7));
			dates.push(getDaysAgo(3));
			dates.push(getDaysAgo(1));
			dates.push(getDaysAgo(0));

			console.log(dates);

			const [res, managerRes] = await Promise.all([

				this.ledgerModel.aggregate([
					{
						$match: {
							isPaid: false,
							paymentDay: { $in: dates }
						}
					},

					// Lookup into the lease collection
					{
						$lookup: {
							from: COLLECTIONS.leases,
							localField: 'lease',
							foreignField: '_id',
							as: 'lease'
						}
					},
					{
						$match: {
							"lease.isClosed": false,
							"lease.isFutureLease": false,
						}
					},
					{
						$unwind: {
							path: '$lease',
							preserveNullAndEmptyArrays: true
						}
					},

					// get associated tenant
					{
						$lookup: {
							from: COLLECTIONS.users,
							localField: REFERENCE.tenant,
							foreignField: '_id',
							as: 'tenant',
						}
					},
					{
						$unwind: {
							path: '$tenant',
							preserveNullAndEmptyArrays: true
						}
					},

					// Lookup into the property collection
					{
						$lookup: {
							from: COLLECTIONS.properties,
							localField: 'property',
							foreignField: '_id',
							as: 'property'
						}
					},
					{
						$unwind: {
							path: '$property',
							preserveNullAndEmptyArrays: true
						}
					},

					// Lookup into the unit collection
					{
						$lookup: {
							from: COLLECTIONS.units,
							localField: 'unit',
							foreignField: '_id',
							as: 'unit'
						}
					},
					{
						$unwind: {
							path: '$unit',
							preserveNullAndEmptyArrays: true
						}
					},

					// Group stage
					{
						$group: {
							_id: "$lease._id",
							company: { $first: "$company" },
							tenant: { $first: "$tenant" },
							property: { $first: "$property" },
							unit: { $first: "$unit" },
							ledgers: {
								$push: {
									_id: { $toString: "$_id" },
									paymentDay: "$paymentDay",
									description: "$description",
									amount: "$amount",
									balance: "$balance"
								}
							}
						}
					},

					// Project stage to format the output
					{
						$project: {
							_id: { $toString: "$_id" },
							company: { $toString: "$company" },
							ledgers: "$ledgers",
							tenant: {
								_id: { $toString: "$tenant._id" },
								name: "$tenant.name",
								email: "$tenant.email",
							},
							property: {
								_id: { $toString: "$property._id" },
								address: "$property.address"
							},
							unit: {
								_id: { $toString: "$unit._id" },
								unitNumber: "$unit.unitNumber"
							}
						}
					}
				]).exec(),

				this.getManagers()
			])
			if (!res.length) throw 'No data found!';

			for (const lease of res) {

				for (const manager of managerRes) {

					if (manager.company === lease.company) {

						// for manager
						let managerMessage = `Dear ${manager?.name},

Please be informed that tenant ${lease?.tenant?.name}, residing at ${lease?.property?.address}, unit ${lease?.unit?.unitNumber}, has an outstanding balance that requires your immediate attention.

Details:`;

						// for tenant 
						let tenantMessage = `Dear ${lease?.tenant?.name},
We hope this message finds you well. This notice is regarding your residence at ${lease?.property?.address}, unit ${lease?.unit?.unitNumber}, where you are currently living.

You have unpaid balance that needs your attention

Details:`;

						for (const ledger of lease?.ledgers) {
							managerMessage += `\n
Description: ${ledger?.description}
Payment Day: ${ledger?.paymentDay}
Amount: ${ledger?.amount}
Balance: ${ledger?.balance}`;

							tenantMessage += `\n
Description: ${ledger?.description}
Payment Day: ${ledger?.paymentDay}
Amount: ${ledger?.amount}
Balance: ${ledger?.balance}`;
						}

						console.log(managerMessage, '\n\n', tenantMessage);
					}
				}
			}
		}
		catch (error) {
			this.logger.error(error);
		}
	}

	async getManagers() {
		return this.userModel.aggregate([
			{
				$match: {
					"role": "manager",
				}
			},
			{
				$project: {
					_id: { $toString: "$_id" },
					company: { $toString: "$company" },
					name: 1,
					email: 1
				}
			}
		]).exec();
	}
}
