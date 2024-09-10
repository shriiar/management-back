import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';
import { Rent } from './lease-rent.model';
import { Lease } from './lease.model';

export type LedgerDocument = Ledger & Document;

export enum Frequency {
	MONTHLY = 'monthly',
}

@Schema({ timestamps: true, autoIndex: true })
export class Ledger {

	_id: string | mongoose.Types.ObjectId;

	@Prop({ type: String, required: true })
	paymentDay: string;

	@Prop({ type: String, required: true })
	description: string;

	@Prop({ type: Number, required: true })
	amount: number;

	@Prop({ type: Number, required: true })
	balance: number;

	@Prop({ type: String, enum: Frequency, required: true })
	frequency: Frequency;

	@Prop({ type: String, required: false, default: false })
	isPaid: boolean;

	@Prop({ type: String, default: '' })
	paymentMethod: string;

	@Prop({
		required: true,
		ref: 'Rent',
		type: mongoose.Schema.Types.ObjectId,
	})
	rent: Rent;

	@Prop({
		required: false,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	tenant: User;

	@Prop({
		required: true,
		ref: 'Rent',
		type: mongoose.Schema.Types.ObjectId,
	})
	lease: Lease;

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

export const LedgerSchema = SchemaFactory.createForClass(Ledger);
