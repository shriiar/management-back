import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';

export type PropertyDocument = Property & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Property {

	_id: string | mongoose.Types.ObjectId;

	@Prop({
		required: [true, 'Name is required'],
		minlength: [3, 'Name must be at least 3 characters long'],
		trim: true,
	})
	name: string;

	@Prop({ type: String, required: true })
	address: string;

	@Prop({ type: String, required: true })
	city: string;

	@Prop({ type: Number, required: true })
	totalUnits: number;

	@Prop({ required: false, default: 0 })
	occupiedUnits: number;

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;

	@Prop({ required: false, default: [] })
	units: [];

	@Prop({ required: false, default: [] })
	incomePerMonth: [];

	@Prop({ required: false, default: [] })
	expensePerMonth: [];

	@Prop({ required: false, default: null })
	imageUrl?: string;

	createdAt: Date;
	updatedAt: Date;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
