import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator"
import { AddUserDto } from "../users/users.validation";
import { Frequency } from "./lease-ledger.model";
import mongoose, { ObjectId } from "mongoose";

export class RentDto {

	@ApiProperty({ example: 100 })
	@IsNotEmpty({ message: 'Amount is required' })
	@IsNumber({}, { message: 'Amount must be a number' })
	amount: number;

	@ApiProperty({ example: 'Bla bla' })
	@IsNotEmpty({ message: 'Description is required' })
	@IsString({ message: 'Description must be a string' })
	description: string;

	@ApiProperty({ example: 'Bla bla notes', required: false })
	@IsOptional()
	@IsString({ message: 'Notes must be a string' })
	notes?: string;

	@ApiProperty({ example: 'monthly', enum: Frequency })
	@IsNotEmpty({ message: 'Frequency is required' })
	@IsEnum(Frequency, { message: 'Frequency must be "monthly"' })
	frequency: Frequency;

	@ApiProperty({ example: 1 })
	@IsNotEmpty({ message: 'Payment day is required' })
	@IsNumber({}, { message: 'Payment day must be a number' })
	paymentDay: number;
}

export class AddLeaseDto {
	@ApiProperty({ example: '2023-01-01' })
	@IsString()
	@IsNotEmpty()
	leaseStart: string

	@ApiProperty({ example: '2024-02-01' })
	@IsString()
	@IsNotEmpty()
	leaseEnd: string

	@ApiProperty({
		example:
			[
				{ amount: 100, description: 'Bla bla', notes: 'Bla bla notes', frequency: 'monthly', paymentDay: 7 }
			]
	})
	@ValidateNested({ each: true })
	@Type(() => RentDto)
	rents: RentDto[]

	@ApiProperty({ example: AddUserDto })
	@IsNotEmpty()
	@IsObject()
	@ValidateNested({ each: true })
	@Type(() => AddUserDto)
	tenant: AddUserDto

	@ApiProperty({ example: '66df3d828e5529a5427ed725' })
	@IsNotEmpty({ message: 'Property is required' })
	@IsMongoId({ message: 'Property must be a mongoDB ID' })
	property: string

	@ApiProperty({ example: '66df3d828e5529a5427ed725' })
	@IsNotEmpty({ message: 'Unit is required' })
	@IsMongoId({ message: 'Unit must be a mongoDB ID' })
	unit: string

	@ApiProperty({ example: '66df3d828e5529a5427ed725' })
	@IsNotEmpty({ message: 'Prospect is required' })
	@IsMongoId({ message: 'Prospect must be a mongoDB ID' })
	prospect: string
}

export class RenewLeaseDto {
	@ApiProperty({ example: '2024-02-01' })
	@IsString()
	@IsNotEmpty()
	leaseEnd: string

	@ApiProperty({
		example:
			[
				{ amount: 150, description: 'Renewed Lease', notes: 'Bla bla notes', frequency: 'monthly', paymentDay: 17 }
			]
	})
	@ValidateNested({ each: true })
	@Type(() => RentDto)
	rents: RentDto[]

	@ApiProperty({ example: '66df3d828e5529a5427ed725' })
	@IsNotEmpty({ message: 'LeaseId is required' })
	@IsMongoId({ message: 'LeaseId must be a mongoDB ID' })
	leaseId: string
}