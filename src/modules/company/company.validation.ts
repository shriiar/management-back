import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsLowercase, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsStrongPassword, MaxLength, MinLength, ValidateNested } from "class-validator";
import { Type } from 'class-transformer';
import { AddUserDto } from "../users/users.validation";

export class AddCompanyDto {
	@ApiProperty({ example: 'Fahim Shahriar', description: 'The name of the User', required: true })
	@IsNotEmpty({ message: 'Name is required' })
	@IsString({ message: 'Name must be a string' })
	name: string;

	@ApiProperty({ example: 'fahim@gmail.com', required: true })
	@IsNotEmpty({ message: 'Email is required' })
	@IsEmail({}, { message: 'Invalid email address' })
	@IsLowercase({ message: 'Email must be lowercase' })
	email: string;

	@ApiProperty({ example: '1216 East Nasirabad', required: true })
	@IsNotEmpty({ message: 'Address is required' })
	@IsString({ message: 'Invalid address' })
	address: string;

	@ApiProperty({ example: 100, required: true })
	@IsNotEmpty({ message: 'allowedUnits is required' })
	@IsNumber({}, { message: 'Invalid number' })
	allowedUnits: number;

	@ApiProperty({ example: 'https://lh3.googleusercontent.com/a/ACg8ocL6ENaRyKehVXK-br8c4HYs3ZIPS6ONCA5s191YGEC5=s96-c' })
	@IsString({ message: 'Image url must be a string' })
	@IsOptional()
	imageUrl?: string;

	@ApiProperty({ example: AddUserDto })
	@IsNotEmpty()
	@IsObject()
	@ValidateNested({ each: true })
	@Type(() => AddUserDto)
	user: AddUserDto
}