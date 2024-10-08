import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Lease } from '../lease/lease.model';
import { Expense } from '../expense/expense.model';
import { Income } from '../income/income.model';

export type UnitDocument = Unit & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Unit {

	_id: string | mongoose.Types.ObjectId;

	@Prop({ type: String, required: true })
	description: string;

	@Prop({ type: String, required: true })
	unitNumber: string;

	@Prop({ type: Number, required: true })
	squareFeet: number;

	@Prop({ type: Number, required: true })
	bedroom: number;

	@Prop({ type: Number, required: true })
	bathroom: number;

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Income' }],
		required: false,
		default: [],
	})
	incomePerMonth: mongoose.Types.ObjectId[] | Income[];

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
		required: false,
		default: [],
	})
	expensePerMonth: mongoose.Types.ObjectId[] | Expense[];

	@Prop({ required: false, default: false })
	isOccupied: boolean;

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lease' }],
		required: false,
		default: [],
	})
	futureLeases: mongoose.Types.ObjectId[] | Lease[];

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lease' }],
		required: false,
		default: [],
	})
	leaseHistories: mongoose.Types.ObjectId[] | Lease[];

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'Lease',
		type: mongoose.Schema.Types.ObjectId,
	})
	lease: Lease;

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	tenant: User;

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'Property',
		type: mongoose.Schema.Types.ObjectId,
	})
	property: Property;

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;

	@Prop({ required: false, default: [] })
	images: [];

	createdAt: Date;
	updatedAt: Date;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
