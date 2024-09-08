import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';
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

	@Prop({ required: true, default: null })
	allowedUnits: number;

	@Prop({
		required: [true, 'User is required'],
		unique: true,
		ref: 'User',
		type: mongoose.Schema.Types.ObjectId,
	})
	user: User;

	@Prop({ required: false, default: null })
	imageUrl?: string;

	createdAt: Date;
	updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
