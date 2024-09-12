import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Company } from 'src/modules/company/company.model';
import { Lease } from 'src/modules/lease/lease.model';
import { Property } from 'src/modules/property/property.model';
import { Unit } from 'src/modules/unit/unit.model';
import { User } from 'src/modules/users/users.model';
import { CARDKNOX_URL } from '../payment.constant';
import { AxiosResponse } from 'axios';

@Injectable()
export class PaymentService {

	public cardknoxUrl = CARDKNOX_URL

	constructor(
		@InjectModel(Company.name) private readonly companyModel: Model<Company>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
		@InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
		@InjectModel(Property.name) private readonly propertyModel: Model<Property>,
		// @InjectModel(Property.name) private readonly propertyModel: Model<Income>,
		@InjectConnection() private readonly connection: mongoose.Connection,

		private readonly http: HttpService,
	) { }

	async onModuleInit() {

	}

	// create customer 
	public async createCustomer(body: {
		name: string,
		email: string,
	}): Promise<string> {

		const url = this.cardknoxUrl.CreateCustomer;

		const requestBody = {
			"SoftwareName": process.env.CARDKNOX_SOFTWARE_NAME,
			"SoftwareVersion": process.env.CARDKNOX_SOFTWARE_VERSION,
			"BillFirstName": body.name,
			"BillMiddleName": "",
			"BillLastName": "",
			"Email": body.email
		}
		const headers = {
			'X-Recurring-Api-Version': '2.1',
			'Authorization': process.env.CARDKNOX_KEY
		}

		const res: AxiosResponse<ICreateCustomer> = await this.http.post(url, requestBody, { headers }).toPromise();
		if (!res.data.CustomerId) throw new BadGatewayException("Error while creating customer");
		return res.data.CustomerId;
	}

}
