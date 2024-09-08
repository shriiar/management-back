import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Company {

	_id: string | mongoose.Types.ObjectId;

	@Prop({
		required: [true, 'Name is required'],
		minlength: [3, 'Name must be at least 3 characters long'],
		trim: true,
	})
	name: string;

	@Prop({ required: true, unique: true, trim: true, lowercase: true })
	email: string;

	@Prop({ type: String, required: true })
	address: string;

	@Prop({ type: Number, required: true })
	allowedUnits: number;

	@Prop({
		required: [true, 'User is required'],
		unique: true,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	admin: User;

	@Prop({ required: false, default: [] })
	users: [];

	@Prop({ required: false, default: [] })
	properties: [];

	@Prop({ required: false, default: [] })
	units: [];

	@Prop({ required: false, default: null })
	imageUrl?: string;

	createdAt: Date;
	updatedAt: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
