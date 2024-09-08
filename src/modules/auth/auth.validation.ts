import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsLowercase, IsNotEmpty, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class UserLoginDto {
    @ApiProperty({ example: 'fahim@gmail.com', required: true })
    @IsEmail({}, {message: 'Invalid email address'})
	@IsLowercase({message: 'Email must be lowercase'})
    email: string;

    @ApiProperty({ example: 'Aa123456', required: true })
    @IsString({ message: 'Password must be a string' })
    password: string;
}