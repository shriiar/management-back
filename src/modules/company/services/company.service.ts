import { BadRequestException, Injectable } from '@nestjs/common';
import { AddCompanyDto } from '../company.validation';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Company, CompanyDocument } from '../company.model';
import { User } from 'src/modules/users/users.model';
import { USER_ROLE } from 'src/modules/users/users.constant';
import { COLLECTIONS } from 'src/common/config/consts';
import { IFullUser } from 'src/modules/users/users.interface';

@Injectable()
export class CompanyService {

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectConnection() private readonly connection: mongoose.Connection,
	) { }

	async getCompany(user: IFullUser) {
		return await this.companyModel.findById(user.company).exec();
	}

	async addCompany(payload: AddCompanyDto): Promise<CompanyDocument> {

		const { user } = payload;

		// Start a session
		const session = await this.connection.startSession();
		try {

			// start transaction
			session.startTransaction();

			// check payload.email and user.email in the Company collection
			const companyCheck = await this.companyModel.aggregate([
				{
					$match: {
						$or: [
							{ email: payload.email },
							{ email: user.email }
						]
					}
				}
			]).session(session);
			if (companyCheck.length > 0) {
				throw new BadRequestException('Company or user email already in use');
			}

			// check payload.email and user.email in the User collection
			const userCheck = await this.userModel.aggregate([
				{
					$match: {
						$or: [
							{ email: payload.email },
							{ email: user.email }
						]
					}
				}
			]).session(session);
			if (userCheck.length > 0) {
				throw new BadRequestException('Company or user email already in use');
			}

			// Adding user to userModel
			const newUser = new this.userModel({
				name: user.name,
				email: user.email,
				password: user.password,
				role: USER_ROLE.admin,
			});
			const savedUser: any = await newUser.save({ session });

			// Now add company & associate user (admin) to the company
			const newCompany = new this.companyModel({
				name: payload.name,
				email: payload.email,
				address: payload.address,
				allowedUnits: payload.allowedUnits,
				imageUrl: payload.imageUrl,
				admin: savedUser._id,
				users: [savedUser._id],
			});
			const savedCompany = await newCompany.save({ session });

			// updating savedUser with the company reference
			savedUser.company = new mongoose.Types.ObjectId(savedCompany._id);
			await savedUser.save({ session });

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

			return savedCompany;
		}
		catch (error) {
			// Abort the transaction in case of an error
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}
}
