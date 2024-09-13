import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Unit } from '../unit/unit.model';
import { Property } from '../property/property.model';

export type ExpenseDocument = Expense & Document;

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
export class Expense {

	_id: Expense | mongoose.Types.ObjectId;

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

	@Prop({ required: false, default: false })
	isPaid: boolean;

	@Prop({
		required: true,
		unique: false,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	addedBy: User;

	@Prop({ type: Boolean, default: false })
	isApproved: boolean;

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	approvedBy: User;

	@Prop({ type: [ReceiptSchema], default: [] })
	receipt: Receipt[];

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'Unit',
		type: mongoose.Schema.Types.ObjectId,
	})
	unit: Unit;

	@Prop({
		required: false,
		default: null,
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

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
