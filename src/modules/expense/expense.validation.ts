import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsDefined, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator"

export class AddExpenseDto {
	@ApiProperty({ example: '2023-05-13' })
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

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsNotEmpty()
	isPaid: boolean;

	@ApiProperty({
		example: 'property',
		required: true,
		enum: ['property', 'unit'],
		enumName: 'addTo',
		description: 'Where to add the expense'
	})
	@IsNotEmpty({ message: 'AddTo is required' })
	@IsString({ message: 'AddTo must be a string' })
	@IsEnum(['property', 'unit'], { message: 'AddTo must be either property or unit' })
	addTo: 'property' | 'unit';

	@ApiProperty({ example: '64cbc171f5212ee891018701' })
	@IsNotEmpty({ message: 'AddToId is required' })
	@IsMongoId({ message: 'AddToId must be a mongoDB ID' })
	addToId: string;
}
