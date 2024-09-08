import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class AddPropertyDto {
	@ApiProperty({ example: 'Fahim Shahriar', description: 'The name of the User', required: true })
	@IsNotEmpty({ message: 'Name is required' })
	@IsString({ message: 'Name must be a string' })
	name: string;

	@ApiProperty({ example: '1216 East Nasirabad', required: true })
	@IsNotEmpty({ message: 'Address is required' })
	@IsString({ message: 'Invalid address' })
	address: string;

	@ApiProperty({ example: '1216 East Nasirabad', required: true })
	@IsNotEmpty({ message: 'Address is required' })
	@IsString({ message: 'Invalid address' })
	city: string;

	@ApiProperty({ example: 10, required: true })
	@IsNotEmpty({ message: 'totalUnits is required' })
	@IsNumber({}, { message: 'Invalid number' })
	totalUnits: number;
}