import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';

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

	@Prop({ required: false, default: [] })
	incomePerMonth: [];

	@Prop({ required: false, default: [] })
	expensePerMonth: [];

	@Prop({ required: false, default: false })
	isOccupied: boolean;

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
