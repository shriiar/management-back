import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Company {

	_id: string | mongoose.Types.ObjectId;

	@Prop({
		required: [true, 'Name is required'],
		minlength: [2, 'Name must be at least 2 characters long'],
		trim: true,
	})
	name: string;

	@Prop({ required: true, unique: true, trim: true, lowercase: true })
	email: string;

	@Prop({ type: String, required: true })
	address: string;

	@Prop({ required: false, default: 0 })
	unitsCount: number;

	@Prop({ type: Number, required: true })
	allowedUnits: number;

	@Prop({
		required: [true, 'User is required'],
		unique: true,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	admin: User;

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		required: false,
		default: [],
	})
	users: mongoose.Types.ObjectId[] | string[];

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
		required: false,
		default: [],
	})
	properties: mongoose.Types.ObjectId[] | string[];

	@Prop({
		type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
		required: false,
		default: [],
	})
	units: mongoose.Types.ObjectId[] | string[];

	@Prop({ required: false, default: null })
	imageUrl?: string;

	createdAt: Date;
	updatedAt: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
