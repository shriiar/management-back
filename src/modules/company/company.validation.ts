import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsLowercase, IsNotEmpty, IsNumber, IsObject, IsString, IsStrongPassword, MaxLength, MinLength, ValidateNested } from "class-validator";
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

	@ApiProperty({ example: 100, required: true })
	@IsNotEmpty({ message: 'allowedUnits is required' })
	@IsNumber({}, { message: 'Invalid number' })
	allowedUnits: number;

	@ApiProperty({ example: { name: 'Fahim', email: 'fahim@gmail.com', password: 'Aa123456' } })
	@IsNotEmpty()
	@IsObject()
	@ValidateNested({ each: true })
	@Type(() => AddUserDto)
	admin: AddUserDto
}