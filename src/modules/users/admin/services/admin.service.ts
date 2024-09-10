import { BadRequestException, Injectable } from '@nestjs/common';
import { AddUserDto } from '../../users.validation';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User } from '../../users.model';
import mongoose, { Model } from 'mongoose';
import { IFullUser } from '../../users.interface';
import { Company } from 'src/modules/company/company.model';

@Injectable()
export class AdminService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }

	async adduser(payload: AddUserDto, user: IFullUser) {

		const { name, email, password } = payload

		// Start a session
		const session = await this.connection.startSession();
		try {
			// start transaction
			session.startTransaction();

			// check the user's company if exist
			const company: any = await this.companyModel.findById(user.company).exec();
			if (!company) {
				throw new BadRequestException("Invalid request");
			}

			// check if the proviced email is already in use
			let isUserExist = await this.userModel.findOne({ email }).exec();
			if (isUserExist) {
				throw new BadRequestException('The email is already in use');
			}

			// store the user & return
			const newUser = new this.userModel({
				...payload,
				company: new mongoose.Types.ObjectId(user?.company)
			});
			const savedUser = await newUser.save();

			// update company to store user inside users array
			company.users.push(savedUser?._id);
			company.save();

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedUser;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}
