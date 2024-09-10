import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';
import { Frequency } from './lease-ledger.model';
import { Lease } from './lease.model';

export type RentDocument = Rent & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Rent {

	_id: string | mongoose.Types.ObjectId;

	@Prop({ type: Number, required: true })
	amount: number;

	@Prop({ type: String, required: true })
	description: string;

	@Prop({ type: String, default: '' })
	notes: string;

	@Prop({ type: String, enum: Frequency, required: true })
	frequency: Frequency;

	@Prop({ type: Number, required: true })
	paymentDay: number;

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
		ref: 'Unit',
		type: mongoose.Schema.Types.ObjectId,
	})
	unit: Unit;

	@Prop({
		required: true,
		ref: 'Property',
		type: mongoose.Schema.Types.ObjectId,
	})
	property: Property;

	@Prop({
		required: true,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;
}

export const RentSchema = SchemaFactory.createForClass(Rent);
