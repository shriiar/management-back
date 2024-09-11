import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';

export type LeaseDocument = Lease & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Lease {

	_id: string | mongoose.Types.ObjectId | string;

	@Prop({ type: String, required: true })
	leaseStart: string;

	@Prop({ type: String, required: true })
	leaseEnd: string;

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
