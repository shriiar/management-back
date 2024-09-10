import { Types } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';
import { IFullUser } from '../users/users.interface';
import { Lease } from './lease.model';

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
	_id: number | string;
	isOccupied: boolean;
	lease: string | null;
	company: string | null;
	tenantHistories: string[] | null;
	tenant: string | null;

	property: {
		_id: string | number;
		occupiedUnits: number;
	};

	occupiedLease: {
		_id: string | number;
		leaseStart: Date;
		leaseEnd: Date;
	} | null;

	futureLeases: {
		_id: string | number;
		leaseStart: Date;
		leaseEnd: Date;
	}[];

	prospect: {
		_id: string | number;
		name: string;
		email: string;
		isApproved: boolean;
	} | null;
}