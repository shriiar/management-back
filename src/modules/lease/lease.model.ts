import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';
import { LeaseStatus } from './lease.interface';

export type LeaseDocument = Lease & Document;

@Schema({ timestamps: false, _id: false })
class Cardknox {
	@Prop({ type: String, default: '' })
	customer: string;
}
const CardknoxSchema = SchemaFactory.createForClass(Cardknox);

@Schema({ timestamps: true, autoIndex: true })
export class Lease {

	_id: string | mongoose.Types.ObjectId | string;

	@Prop({ type: String, required: true })
	leaseStart: string;

	@Prop({ type: String, required: true })
	leaseEnd: string;

	@Prop({
		type: String,
		enum: LeaseStatus,
		required: true,
		default: LeaseStatus.PENDING,
	})
	status: LeaseStatus;

	@Prop({ required: false, default: false })
	isClosed: boolean;

	@Prop({ required: false, default: false })
	isFutureLease: boolean;

	@Prop({ required: false, default: false })
	isEviction: boolean;

	@Prop({ required: false, default: '' })
	evictionReason: string;

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rent' }],
		required: false,
		default: [],
	})
	rents: mongoose.Types.ObjectId[] | string[];

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' }],
		required: false,
		default: [],
	})
	ledgers: mongoose.Types.ObjectId[] | string[];

	@Prop({ type: CardknoxSchema, default: { customer: '' } })
	cardknox: Cardknox;

	// to store tenant info once lease is closed/inactive
	@Prop({
		type: {
			name: { type: String, required: false },
			email: { type: String, required: false },
		},
		default: null
	})
	tenantRecord: {
		name?: string;
		email?: string;
	} | null;

	@Prop({
		required: false,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	tenant: User;

	@Prop({
		required: true,
		ref: 'Property',
		type: mongoose.Schema.Types.ObjectId,
	})
	property: Property;

	@Prop({
		required: true,
		ref: 'Unit',
		type: mongoose.Schema.Types.ObjectId,
	})
	unit: Unit;

	@Prop({
		required: true,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;
}

export const LeaseSchema = SchemaFactory.createForClass(Lease);
