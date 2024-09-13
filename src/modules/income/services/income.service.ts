import { BadRequestException, Injectable } from '@nestjs/common';
import { AddIncomeDto } from '../income.validation';
import { Property } from '../../property/property.model';
import { Unit } from '../../unit/unit.model';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { IFullUser } from 'src/modules/users/users.interface';
import { Income, IncomeDocument } from '../income.model';
import { Lease } from 'src/modules/lease/lease.model';
import { isValidDate } from 'src/utils/dateHandler';
import * as moment from 'moment-timezone'
import { DEFAULT_TIMEZONE } from 'src/common/config/timezone.config';
import { COLLECTIONS, REFERENCE } from 'src/common/config/consts';
import { Ledger } from 'src/modules/lease/lease-ledger.model';
import { ILedger } from 'src/modules/lease/lease.interface';
import { PaymentService } from 'src/modules/payment/services/payment.service';

@Injectable()
export class IncomeService {

	constructor(
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Property>,
		@InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
		@InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
		@InjectModel(Income.name) private readonly incomeModel: Model<Income>,
		@InjectConnection() private readonly connection: mongoose.Connection,

		// services
		private readonly paymentService: PaymentService
	) { }

	// a payment for each ledger
	async addIncome(payload: AddIncomeDto, user: IFullUser): Promise<IncomeDocument> {

		let { date, description, amount, note, cardNumber, exp, cvv, lease } = payload;

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

			amount = parseFloat((amount).toFixed(2));

			const [res]: any = await this.ledgerModel.aggregate([
				{
					$match: {
						lease: new mongoose.Types.ObjectId(lease),
						company: new mongoose.Types.ObjectId(user?.company),
						isPaid: false
					}
				},

				// get associated lease
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
						"lease.tenant": new mongoose.Types.ObjectId(user?._id)
					}
				},
				{ $unwind: '$lease' },

				// get associated unit
				{
					$lookup: {
						from: COLLECTIONS.units,
						localField: REFERENCE.unit,
						foreignField: '_id',
						as: 'unit',
					}
				},
				{ $unwind: '$unit' },

				// get associated property
				{
					$lookup: {
						from: COLLECTIONS.properties,
						localField: REFERENCE.property,
						foreignField: '_id',
						as: 'property',
					}
				},
				{ $unwind: '$property' },

				// Group stage
				{
					$group: {
						_id: "$lease._id",
						cardknox: { $first: "$lease.cardknox" },
						company: { $first: "$company" },
						property: { $first: "$property" },
						unit: { $first: "$unit" },
						ledgers: {
							$push: {
								_id: "$_id",
								amount: "$amount",
								balance: "$balance",
								isPaid: "$isPaid",
							}
						},
						totalLedgerBalance: { $sum: "$balance" }
					}
				},

				// Project stage to format the output
				{
					$project: {
						_id: "$_id",
						company: "$company",
						totalLedgerBalance: "$totalLedgerBalance",
						cardknox: "$cardknox",
						ledgers: "$ledgers",
						property: {
							_id: "$property._id",
							address: "$property.address"
						},
						unit: {
							_id: "$unit._id",
							unitNumber: "$unit.unitNumber"
						}
					}
				}
			]).exec();
			if (!res) throw new BadRequestException("Invalid request");

			if (amount > res?.totalLedgerBalance) {
				throw new BadRequestException("Given amount should be less or equal to the remaining ledger balance");
			}

			// this array is used to store the updated ledgers whose balance will be reduced
			const updatedLedgers: Partial<ILedger[]> = [];

			// we dont want to decrease the payload amount, as we need to add income where amount is required
			let totalAmount = amount;

			for (const ledger of res?.ledgers) {
				if (totalAmount === 0) break;

				const ledgerBalance = ledger?.balance;

				if (ledgerBalance > 0) {

					// Take the minimum of the two
					const adjustedBalance = Math.min(ledgerBalance, totalAmount);

					updatedLedgers.push({
						...ledger,
						balance: parseFloat((ledgerBalance - adjustedBalance).toFixed(2)),
						isPaid: (ledgerBalance - adjustedBalance) === 0 ? true : ledger.isPaid
					});

					totalAmount = parseFloat((totalAmount - adjustedBalance).toFixed(2));

					// Ensure totalAmount doesn't go negative
					if (totalAmount < 0) {
						totalAmount = 0;
					}
				}
			}

			const paymentRes = await this.paymentService.oneTimePayment({
				name: user?.name,
				email: user?.email,
				customer: res?.cardknox?.customer,
				amount: amount,
				cardNumber: cardNumber,
				exp: exp
			});

			// database transactions
			const newIncomeId = new mongoose.Types.ObjectId();

			// Prepare the bulkWrite operations
			const bulkOps = updatedLedgers.map(ledger => ({
				updateOne: {
					filter: { _id: new mongoose.Types.ObjectId(ledger._id) },
					update: {
						$set: {
							balance: ledger.balance,
							isPaid: ledger.isPaid
						},
						$push: { incomes: newIncomeId },
					}
				}
			}));
			await this.ledgerModel.bulkWrite(bulkOps, { session });

			const newIncome = new this.incomeModel({
				_id: newIncomeId,
				month: monthYear.month() + 1,
				year: monthYear.year(),
				paymentDay: date,
				description: description,
				note: note,
				ledgers: updatedLedgers,
				cardknox: paymentRes,
				addedBy: user?._id,
				lease: new mongoose.Types.ObjectId(lease),
				unit: res?.unit?._id,
				property: res?.property?._id,
				company: user?._id
			})
			const savedData = await newIncome.save({ session });

			// update property
			await this.propertyModel.updateOne(
				{ _id: res?.property?._id },
				{
					$push: { incomePerMonth: savedData._id },
				},
				{ session },
			);

			// update unit
			await this.unitModel.updateOne(
				{ _id: res?.unit?._id },
				{
					$push: { incomePerMonth: savedData._id },
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
