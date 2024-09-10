import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.model';
import { Company } from '../company/company.model';
import { Property } from '../property/property.model';
import { Unit } from '../unit/unit.model';

export type ProspectDocument = Prospect & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Prospect {

	_id: string | mongoose.Types.ObjectId;

	@Prop({
		required: [true, 'Name is required'],
		minlength: [3, 'Name must be at least 3 characters long'],
		trim: true,
	})
	name: string;

	@Prop({ required: true, unique: false, trim: true, lowercase: true })
	email: string;

	@Prop({ required: false, default: true })
	isApproved?: boolean;

	@Prop({
		required: true,
		default: null,
		unique: false,
		ref: 'Company',
		type: mongoose.Schema.Types.ObjectId,
	})
	company: Company;

	@Prop({
		required: true,
		default: null,
		unique: false,
		ref: 'Property',
		type: mongoose.Schema.Types.ObjectId,
	})
	property: Property;

	@Prop({
		required: true,
		default: null,
		unique: false,
		ref: 'Unit',
		type: mongoose.Schema.Types.ObjectId,
	})
	unit: Unit;

	createdAt: Date;
	updatedAt: Date;
}

export const ProspectSchema = SchemaFactory.createForClass(Prospect);
