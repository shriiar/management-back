import { Types } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';

export interface ILedger {
	_id: string | Types.ObjectId;
	paymentDay: string;
	description: string;
	amount: number;
	balance: number;
	frequency: "monthly";
	isPaid: boolean;
	paymentMethod?: string; // Optional field
	tenant: string | Types.ObjectId;
	rent: string | Types.ObjectId;
	lease: string | Types.ObjectId;
	property: string | Types.ObjectId;
	unit: string | Types.ObjectId;
	company: string | Types.ObjectId;
}

export interface IRent {
	_id: string | Types.ObjectId;
	amount: number;
	description: string;
	notes?: string; // Optional field
	frequency: "monthly";
	paymentDay: number;
	tenant: string | Types.ObjectId;
	lease: string | Types.ObjectId;
	property: string | Types.ObjectId;
	unit: string | Types.ObjectId;
	company: string | Types.ObjectId;
}

export interface ILease {
	_id: string | Types.ObjectId;

	leaseStart: Date;
	leaseEnd: Date;

	isClosed?: boolean;
	isFutureTenant?: boolean;
	isEviction?: boolean;
	evictionReason?: string;

	rents?: Types.ObjectId[] | string[];
	ledgers?: Types.ObjectId[] | string[];

	tenant: User | Types.ObjectId;
	futureTenant?: User | Types.ObjectId;

	property: Property | Types.ObjectId;
	unit: Unit | Types.ObjectId;
	company: Company | Types.ObjectId;

	createdAt: Date;
	updatedAt: Date;
}

export interface IAddLeaseRes {
	_id: string | Types.ObjectId;
	isOccupied: boolean;
	lease: string | Types.ObjectId;
	company: string | Types.ObjectId;
	tenantHistories: string[] | null;
	tenant: string | Types.ObjectId;

	property: {
		_id: string | Types.ObjectId;
		occupiedUnits: number;
	};

	occupiedLease: {
		_id: string | Types.ObjectId;
		leaseStart: Date;
		leaseEnd: Date;
	} | null;

	futureLeases: {
		_id: string | Types.ObjectId;
		leaseStart: Date;
		leaseEnd: Date;
	}[];

	prospect: {
		_id: string | Types.ObjectId;
		name: string;
		email: string;
		isApproved: boolean;
	} | null;
}