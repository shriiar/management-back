import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Unit } from '../unit/unit.model';
import { Income } from '../income/income.model';
import { Expense } from '../expense/expense.model';

export type PropertyDocument = Property & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Property {

	_id: string | mongoose.Types.ObjectId;

	@Prop({
		required: [true, 'Name is required'],
		minlength: [2, 'Name must be at least 2 characters long'],
		trim: true,
	})
	name: string;

	@Prop({ type: String, required: true })
	address: string;

	@Prop({ type: String, required: true })
	city: string;

	@Prop({ type: Number, required: true })
	unitsCount: number;

	@Prop({ required: false, default: 0 })
	occupiedUnits: number;

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

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
		required: false,
		default: [],
	})
	units: mongoose.Types.ObjectId[] | Unit[];

	@Prop({
		required: true,
		unique: false,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;


	@Prop({ required: false, default: null })
	imageUrl?: string;

	createdAt: Date;
	updatedAt: Date;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
