import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './users.model';
import { Model } from 'mongoose';
import envConfig from 'src/common/config/envConfig';

@Injectable()
export class UsersService {

	constructor(
		@InjectModel(User.name) private readonly userModel: Model<User>,
	) { }


	async findFullUserById(id: string): Promise<User | undefined> {
		return this.userModel.findById(id).populate('subscription', '-__v').select('-__v -password');
	}
}
