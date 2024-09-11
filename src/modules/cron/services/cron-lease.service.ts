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
import { getDaysAhead } from 'src/utils/dateSchedule.utils';

@Injectable()
export class CronLeaseService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
		@InjectModel(Rent.name) private readonly rentModel: Model<Rent>,
		@InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
	) { }

	onModuleInit() {
		this.checkUpcomingPayments();
	}

	@Cron(CronExpression.EVERY_DAY_AT_6AM, {
		timeZone: DEFAULT_TIMEZONE,
	})
	async handleCorn() {
		await this.checkUpcomingPayments();
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
			throw error;
		}
	}
}
