import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Unit } from '../unit/unit.model';
import { Property } from '../property/property.model';
import { Ledger } from '../lease/lease-ledger.model';
import { Lease } from '../lease/lease.model';

export type IncomeDocument = Income & Document;

@Schema({ timestamps: false, _id: false })
class Cardknox {
	@Prop({ type: String, default: '' })
	RefNum: string;

	@Prop({ type: String, default: '' })
	Result: string;

	@Prop({ type: String, default: '' })
	GatewayRefNum: string;

	@Prop({ type: String, default: '' })
	GatewayStatus: string;

	@Prop({ type: String, default: '' })
	GatewayErrorMessage: string;
}
const CardknoxSchema = SchemaFactory.createForClass(Cardknox);

@Schema({ timestamps: false, _id: false })
class Receipt {
	@Prop({ type: String, required: true })
	id: string;

	@Prop({ type: String, required: true })
	name: string;

	@Prop({ type: String, required: true })
	mimeType: string;

	@Prop({ type: Number, required: true })
	size: number;
}
const ReceiptSchema = SchemaFactory.createForClass(Receipt);

@Schema({ timestamps: true, autoIndex: true })
export class Income {

	_id: Income | mongoose.Types.ObjectId;

	@Prop({ type: Number, required: true })
	month: number;

	@Prop({ type: Number, required: true })
	year: number;

	@Prop({ type: String, required: true })
	paymentDay: string;

	@Prop({ type: String, required: true })
	description: string;

	@Prop({ type: String, default: '' })
	note: string;

	@Prop({ type: [ReceiptSchema], default: [] })
	receipt: Receipt[];

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' }],
		required: true,
	})
	ledgers: mongoose.Types.ObjectId[] | Ledger[];

	@Prop({ type: CardknoxSchema, required: true })
	cardknox: Cardknox;

	@Prop({
		required: true,
		unique: false,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	addedBy: User;

	@Prop({
		required: true,
		unique: false,
		ref: 'Lease',
		type: mongoose.Schema.Types.ObjectId,
	})
	lease: Lease;

	@Prop({
		required: true,
		unique: false,
		ref: 'Unit',
		type: mongoose.Schema.Types.ObjectId,
	})
	unit: Unit;

	@Prop({
		required: true,
		unique: false,
		ref: 'Property',
		type: mongoose.Schema.Types.ObjectId,
	})
	property: Property;

	@Prop({
		required: true,
		unique: false,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;

	createdAt: Date;
	updatedAt: Date;
}

export const IncomeSchema = SchemaFactory.createForClass(Income);
