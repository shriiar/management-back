import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator"
import { AddUserDto } from "../users/users.validation";

enum Frequency {
	MONTHLY = 'monthly',
	YEARLY = 'yearly',
}

export class RentChargeDto {
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
	@IsEnum(Frequency, { message: 'Frequency must be either "monthly" or "yearly"' })
	frequency: Frequency;

	@ApiProperty({ example: 1 })
	@IsNotEmpty({ message: 'Payment day is required' })
	@IsNumber({}, { message: 'Payment day must be a number' })
	paymentDay: number;
}

export class AddLeaseDto {
	@ApiProperty({ example: '2024-01-01', type: Date })
	@IsNotEmpty({ message: 'LeaseStart is required' })
	@IsDate({ message: 'LeaseStart must be a valid date' })
	@Type(() => Date)
	leaseStart: Date;

	@ApiProperty({ example: '2024-12-31', type: Date })
	@IsNotEmpty({ message: 'LeaseEnd is required' })
	@IsDate({ message: 'LeaseEnd must be a valid date' })
	@Type(() => Date)
	leaseEnd: Date;

	@ApiProperty({
		example:
			[
				{ amount: 100, description: 'Bla bla', notes: 'Bla bla notes', frequency: 'monthly', paymentDay: 7 }
			]
	})
	@ValidateNested({ each: true })
	@Type(() => RentChargeDto)
	rentCharges: RentChargeDto[]

	@ApiProperty({ example: AddUserDto })
	@IsNotEmpty()
	@IsObject()
	@ValidateNested({ each: true })
	@Type(() => AddUserDto)
	user: AddUserDto

	@ApiProperty({ example: '66df3d828e5529a5427ed725' })
	@IsNotEmpty({ message: 'Prospect is required' })
	@IsMongoId({message: 'Prospect must be a mongoDB ID'})
	Prospect: string
}