import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsLowercase, IsMongoId, IsNotEmpty, IsNumber, IsString, Matches } from "class-validator";

export class AddProspectDto {
	@ApiProperty({ example: 'Fahim Shahriar', description: 'The name of the User', required: true })
	@IsNotEmpty({ message: 'Name is required' })
	@IsString({ message: 'Name must be a string' })
	name: string;

	@ApiProperty({ example: 'fahim@gmail.com', required: true })
	@IsNotEmpty({ message: 'Email is required' })
	@IsEmail({}, { message: 'Invalid email address' })
	@IsLowercase({ message: 'Email must be lowercase' })
	email: string;

	@ApiProperty({ example: '66e35300b56f090d245a291e' })
	@IsNotEmpty({ message: 'Property is required' })
	@IsMongoId({message: 'Property must be a mongoDB ID'})
	property: string

	@ApiProperty({ example: '66e3533bb56f090d245a2930' })
	@IsNotEmpty({ message: 'Unit is required' })
	@IsMongoId({message: 'Unit must be a mongoDB ID'})
	unit: string
}