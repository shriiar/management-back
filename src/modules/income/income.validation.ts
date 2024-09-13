import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsDefined, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator"

export class AddIncomeDto {
	@ApiProperty({ example: '2024-05-11' })
	@IsString()
	@IsNotEmpty()
	date: string;

	@ApiProperty({ example: 'Bla bla description' })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ example: 500 })
	@IsNumber()
	@IsNotEmpty()
	@Min(0, { message: 'Amount must be greater than or equal to 0' })
	amount: number;

	@ApiProperty({ example: 'Bla bla notes' })
	@IsString()
	@IsOptional()
	note: string;

	@ApiProperty({ example: '4444333322221111' })
	@IsNotEmpty({ message: 'CardNumber is required' })
	@IsString()
	cardNumber: string

	@ApiProperty({ example: '1030' })
	@IsString()
	@IsNotEmpty()
	exp: string

	@ApiProperty({ example: '501' })
	@IsString()
	@IsNotEmpty()
	cvv: string

	@ApiProperty({ example: '64cbc171f5212ee891018701' })
	@IsNotEmpty({ message: 'Lease is required' })
	@IsMongoId({ message: 'Lease must be a mongoDB ID' })
	lease: string;
}
