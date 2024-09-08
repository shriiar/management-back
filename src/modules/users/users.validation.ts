import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsLowercase, IsNotEmpty, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class AddUserDto {
	@ApiProperty({ example: 'Fahim Shahriar', description: 'The name of the User', required: true })
	@IsNotEmpty({ message: 'Name is required' })
	@IsString({ message: 'Name must be a string' })
	name: string;

	@ApiProperty({ example: 'fahim@ewsautomation.com', required: true })
	@IsNotEmpty({ message: 'Email is required' })
	@IsEmail({}, { message: 'Invalid email address' })
	@IsLowercase({ message: 'Email must be lowercase' })
	email: string;

	@ApiProperty({ example: 'admin', required: true, enum: ['manager', 'accountant', 'admin'], enumName: 'role', description: 'The role of the user' })
	@IsString({ message: 'Role must be a string' })
	role: 'manager' | 'accountant' | 'admin';

	@ApiProperty({ example: 'Aa123456', required: true })
	@IsString({ message: 'Password must be a string' })
	@IsNotEmpty({ message: 'Password is required' })
	@MinLength(6, { message: 'Password must be at least 6 characters long' })
	@MaxLength(20, { message: 'Password must be at most 20 characters long' })
	@IsStrongPassword({ minUppercase: 1, minNumbers: 1, minLowercase: 1, minLength: 6, minSymbols: 0 }, { message: 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter and one number' })
	password: string;
}