import { BadRequestException } from "@nestjs/common"
import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from "src/common/config/timezone.config"
import { IAddLeaseRes, ILease, ILedger, IRent } from "src/modules/lease/lease.interface"
import { AddLeaseDto } from "src/modules/lease/lease.validation"
import { IFullUser } from "src/modules/users/users.interface"
import { getLastDayOfMonth, isValidDate } from "./dateHandler"
import mongoose, { Types } from "mongoose"

export function validateLedgerDate(payload: {
	leaseStart: string,
	leaseEnd: string,
	occupiedLease: Partial<ILease>,
	futureLeases: Partial<ILease[]>
}) {

	const { leaseStart, leaseEnd, occupiedLease, futureLeases } = payload

	// parse the lease start and end dates
	const leaseStartDate = moment(leaseStart).startOf('day');
	const leaseEndDate = moment(leaseEnd).startOf('day');

	// Check for valid date range
	if (!leaseStartDate.isBefore(leaseEndDate)) {
		throw new BadRequestException('Invalid date range');
	}

	// check against currently occupied lease
	if (occupiedLease?._id) {
		const occupiedStartDate = moment(occupiedLease.leaseStart).startOf('day');
		const occupiedEndDate = moment(occupiedLease.leaseEnd).startOf('day');

		// Validate if the new lease dates overlap with the occupied lease dates
		if (leaseStartDate.isBetween(occupiedStartDate, occupiedEndDate, undefined, '[]') ||
			leaseEndDate.isBetween(occupiedStartDate, occupiedEndDate, undefined, '[]')) {
			throw new BadRequestException('Selected dates overlap with an occupied lease. Please select another date range.');
		}
	}

	// check against future leases
	futureLeases.forEach(futureLease => {
		const futureStartDate = moment(futureLease.leaseStart).startOf('day');
		const futureEndDate = moment(futureLease.leaseEnd).startOf('day');

		// validate if the new lease dates overlap with any future lease dates
		if (leaseStartDate.isBetween(futureStartDate, futureEndDate, undefined, '[]') ||
			leaseEndDate.isBetween(futureStartDate, futureEndDate, undefined, '[]') ||
			leaseStartDate.isSameOrBefore(futureStartDate) && leaseEndDate.isSameOrAfter(futureEndDate)) {
			throw new BadRequestException('Selected dates overlap with a future lease. Please select another date range.');
		}
	});
}

export function populateLedgers(
	payload: {
		leaseStart: string,
		leaseEnd: string,
		rents: Partial<IRent[]>,
		tenant: string | Types.ObjectId,
		lease: string | Types.ObjectId,
		unit: string | Types.ObjectId,
		property: string | Types.ObjectId,
		company: string | Types.ObjectId,
	}): Promise<{
		rents: Partial<IRent>[],
		ledgers: Partial<ILedger>[]
	}> {

	const rents: Partial<IRent>[] = [];
	const ledgers: Partial<ILedger>[] = [];

	const [startYear, startMonth, startDay] = payload?.leaseStart.split('-').map(Number);
	const lastDay = getLastDayOfMonth(startYear, startMonth);
	const daysLeft = (lastDay - startDay) + 1;

	const todayDate = moment().tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');

	payload?.rents.forEach(rentCharge => {

		// assigniong new parent id to each rent charge
		const rent = rentCharge?._id ? new mongoose.Types.ObjectId(rentCharge?._id) : new mongoose.Types.ObjectId();

		rents.push({
			...rentCharge,
			_id: rent,
			tenant: payload.tenant ? new mongoose.Types.ObjectId(payload.tenant) : null,
			lease: new mongoose.Types.ObjectId(payload.lease),
			unit: new mongoose.Types.ObjectId(payload?.unit),
			property: new mongoose.Types.ObjectId(payload?.property),
			company: new mongoose.Types.ObjectId(payload.company),
		})

		const paymentDay = rentCharge.paymentDay;

		const dates = getLedgerDates(payload.leaseStart, payload.leaseEnd);

		dates.forEach((date, index) => {
			const [year, month, day] = date.split('-').map(Number);
			const monthString = month.toString().padStart(2, '0');
			const dayString = paymentDay.toString().padStart(2, '0');

			const ledgerDate = (index === 0 && payload?.leaseStart < todayDate)
				? payload?.leaseStart
				: `${year}-${monthString}-${dayString}`;

			const newAmount = (index === 0 && payload?.leaseStart < todayDate)
				? +((rentCharge.amount / lastDay) * daysLeft).toFixed(2)
				: rentCharge.amount;

			const ledger: Partial<ILedger> = {
				_id: new mongoose.Types.ObjectId(),
				paymentDay: ledgerDate,
				description: rentCharge.description,
				amount: newAmount,
				balance: newAmount,
				paymentMethod: null,
				frequency: 'monthly',
				isPaid: false,
				rent: new mongoose.Types.ObjectId(rent),
				tenant: payload.tenant ? new mongoose.Types.ObjectId(payload.tenant) : null,
				lease: new mongoose.Types.ObjectId(payload.lease),
				unit: new mongoose.Types.ObjectId(payload?.unit),
				property: new mongoose.Types.ObjectId(payload?.property),
				company: new mongoose.Types.ObjectId(payload.company),
			};

			ledgers.push(ledger);
		});
	});

	ledgers.sort((a, b) => {
		const dateA: any = new Date(a.paymentDay);
		const dateB: any = new Date(b.paymentDay);
		return dateA - dateB;
	});

	return Promise.resolve({ rents, ledgers });
}

export function getLedgerDates(leaseStart: string, leaseEnd: string) {
	const firstDates = [];
	const [startYear, startMonth] = leaseStart.split('-');
	const [endYear, endMonth] = leaseEnd.split('-');

	let currentYear = parseInt(startYear);
	let currentMonth = parseInt(startMonth);

	while (currentYear < parseInt(endYear) || (currentYear === parseInt(endYear) && currentMonth <= parseInt(endMonth))) {
		const firstDateOfMonth = moment.tz([currentYear, currentMonth - 1, 1], DEFAULT_TIMEZONE);

		const year = firstDateOfMonth.format('YYYY');
		const month = firstDateOfMonth.format('MM');
		const day = '01';

		const formattedDate = `${year}-${month}-${day}`;
		firstDates.push(formattedDate);

		if (currentMonth === 12) {
			currentYear++;
			currentMonth = 1;
		}
		else {
			currentMonth++;
		}
	}

	return firstDates;
}