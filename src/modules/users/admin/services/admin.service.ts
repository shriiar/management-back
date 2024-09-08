import { BadRequestException, Injectable } from '@nestjs/common';
import { AddUserDto } from '../../users.validation';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../../users.model';
import { Model } from 'mongoose';

@Injectable()
export class AdminService {

	constructor(
		@InjectModel(User.name) private readonly userModel: Model<User>,
	) { }

	async adduser(payload: AddUserDto) {

		const { name, email, password } = payload

		// check if the proviced email is already in use
		let user = await this.userModel.findOne({ email }).exec();
		if (user) {
			throw new BadRequestException('The email is already in use');
		}

		// store the user & return
		const newUser = new this.userModel(payload);
		user = await newUser.save();

		return user;

	}
}
