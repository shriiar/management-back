import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Company } from '../company/company.model';

export type UserDocument = User & Document;

@Schema({ timestamps: false, _id: false, versionKey: false })
export class Settings {
	@Prop({ required: false, default: true })
	isGetEmail: boolean;

	@Prop({ required: false, default: true })
	isGetNotification: boolean;
}

@Schema({ timestamps: true, autoIndex: true })
export class User {

	_id: string | mongoose.Types.ObjectId;

	@Prop({
		required: [true, 'Name is required'],
		minlength: [3, 'Name must be at least 3 characters long'],
		trim: true,
	})
	name: string;

	@Prop({ required: true, unique: true, trim: true, lowercase: true })
	email: string;

	@Prop({
		required: true,
		select: false,
	})
	password: string;

	@Prop({
		required: true,
		enum: {
			values: ['manager', 'accountant', 'admin', 'super_admin'],
			message: 'Role is either: user or admin',
		},
		default: 'manager',
	})
	role: string;

	@Prop({
		required: false,
		default: null,
		unique: false,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;

	@Prop({ required: false, default: null })
	imageUrl?: string;

	@Prop({ required: true, default: false })
	isVerified?: boolean;

	@Prop({ required: false, default: false })
	isBlocked?: boolean;

	@Prop({ required: false, default: false })
	isDeleted?: boolean;

	@Prop({ type: Settings, default: new Settings() })
	settings: Settings;

	createdAt: Date;
	updatedAt: Date;
	timezone?: string;

	checkPassword: (
		plainPassword: string,
		hashedPassword: string,
	) => Promise<boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next: any) {
	if (!this.isModified('password')) {
		return next();
	}
	this['password'] = await bcrypt.hash(this['password'], 10);
	next();
});

UserSchema.statics.checkPassword = async function (
	plainPassword: string,
	hashedPassword: string,
) {
	return await bcrypt.compare(plainPassword, hashedPassword);
};
