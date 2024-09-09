import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty, IsNumber, IsString, Matches } from "class-validator";

export class AddUnitDto {
	@ApiProperty({ example: 'Bla bla', required: true })
	@IsNotEmpty({ message: 'Description is required' })
	@IsString({ message: 'Invalid description' })
	description: string;

	@ApiProperty({ example: '10A' })
	@IsString()
	@IsNotEmpty()
	@Matches(/^(?=.*\d)[A-Za-z\d]*$/, {
		message: 'unit number must contain at least one digit & alphabets are optional',
	})
	unitNumber: string

	@ApiProperty({ example: 1500, required: true })
	@IsNotEmpty({ message: 'squareFeet is required' })
	@IsNumber({}, { message: 'Invalid squareFeet' })
	squareFeet: number;

	@ApiProperty({ example: 1500, required: true })
	@IsNotEmpty({ message: 'bedroom is required' })
	@IsNumber({}, { message: 'Invalid bedroom' })
	bedroom: number;

	@ApiProperty({ example: 1500, required: true })
	@IsNotEmpty({ message: 'bathroom is required' })
	@IsNumber({}, { message: 'Invalid bathroom' })
	bathroom: number;

	@ApiProperty({ example: '64cbc171f5212ee891018701' })
	@IsNotEmpty({ message: 'Property is required' })
	@IsMongoId({message: 'Property must be a mongoDB ID'})
	property: string
}