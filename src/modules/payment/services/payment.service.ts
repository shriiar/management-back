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

	public async oneTimePayment(body: {
		name: string,
		email: string,
		amount: number,
		customer: string,
		cardNumber: string,
		exp: string
	}): Promise<IOneTimePayment> {

		const { name, email, amount, customer, cardNumber, exp } = body;

		// generates token using provided card number
		const token = await this.generateCardToken({
			cardNumber: cardNumber,
			exp: exp,
			name: name
		});

		// creates a temporary payment method to process the transaction
		const paymentMethod = await this.createPaymentMethod({
			customer: customer,
			exp: exp,
			name: name,
			token: token
		});

		const cardknoxUrl = this.cardknoxUrl.ProcessTransaction;

		const requestBody = {
			"SoftwareName": process.env.CARDKNOX_SOFTWARE_NAME,
			"SoftwareVersion": process.env.CARDKNOX_SOFTWARE_VERSION,
			"CustomerId": customer,
			"Amount": amount,
			"BillStreet": "",
			"BillCity": "",
			"BillState": "",
			"BillCountry": "",
			"BillFirstName": name,
			"BillMiddleName": "",
			"BillLastName": "",
			"Email": email,
		};

		const headers = {
			'X-Recurring-Api-Version': '2.1',
			'Authorization': process.env.CARDKNOX_KEY
		};

		const res: AxiosResponse<IOneTimePayment> = await this.http.post(cardknoxUrl, requestBody, { headers }).toPromise();

		// as a temporary payment method was created we will remove that
		await this.deletePaymentMethod({
			PaymentMethodId: paymentMethod
		});

		if (res?.data?.Result === 'E' || res?.data?.Error || res?.data?.GatewayStatus === 'Error') throw new BadGatewayException(res?.data?.Error || res?.data?.GatewayErrorMessage);

		return res?.data;
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
		};
		const headers = {
			'X-Recurring-Api-Version': '2.1',
			'Authorization': process.env.CARDKNOX_KEY
		};

		const res: AxiosResponse<ICustomer> = await this.http.post(url, requestBody, { headers }).toPromise();

		if (!res?.data?.CustomerId) throw new BadGatewayException(res?.data?.Error);

		return res.data.CustomerId;
	}

	//remove the customer from the cardknox
	public async deleteCustomer(body: {
		customer: string
	}) {

		const { customer } = body;

		const requestBody = {
			"SoftwareName": process.env.CARDKNOX_SOFTWARE_NAME,
			"SoftwareVersion": process.env.CARDKNOX_SOFTWARE_VERSION,
			"CustomerId": customer,
		}
		const headers = {
			'X-Recurring-Api-Version': '2.1',
			'Authorization': process.env.CARDKNOX_KEY
		}
		await this.http.post(this.cardknoxUrl.DeleteCustomer, requestBody, { headers }).toPromise();
	}

	// generate token using provided card
	public async generateCardToken(body: {
		cardNumber: string,
		exp: string,
		name: string,
	}): Promise<string> {

		const { cardNumber, exp, name } = body;

		const url = this.cardknoxUrl.GateWayJSON;

		const requestBody = {
			"xKey": process.env.CARDKNOX_KEY,
			"xName": name,
			"xCardNum": cardNumber,
			"xExp": exp,
			"xStreet": "",
			"xVersion": "5.0.0",
			"xSoftwareName": process.env.CARDKNOX_SOFTWARE_NAME,
			"xSoftwareVersion": process.env.CARDKNOX_SOFTWARE_VERSION,
			"xCommand": "cc:Save",
		};

		const res: AxiosResponse<IToken> = await this.http.post(url, requestBody).toPromise();

		if (!res?.data?.xToken) throw new BadGatewayException(res?.data?.xError);

		return res?.data?.xToken;
	}

	// create payment method for recurring payments
	public async createPaymentMethod(body: {
		customer: string,
		token: string,
		exp: string,
		name: string,
	}): Promise<string> {

		const { exp, name, token, customer } = body;

		const url = this.cardknoxUrl.CreateMethod;

		const requestBody = {
			"SoftwareName": process.env.CARDKNOX_SOFTWARE_NAME,
			"SoftwareVersion": process.env.CARDKNOX_SOFTWARE_VERSION,
			"CustomerId": customer,
			"Token": token,
			"TokenType": "cc",
			"Exp": exp,
			"Name": name,
			"Street": "",
		};
		const headers = {
			'X-Recurring-Api-Version': '2.1',
			'Authorization': process.env.CARDKNOX_KEY
		};

		const res: AxiosResponse<IPaymentMethod> = await this.http.post(url, requestBody, { headers }).toPromise();

		if (!res?.data?.PaymentMethodId) throw new BadGatewayException(res?.data?.Error);

		return res?.data?.PaymentMethodId;
	}

	// delete payment method
	public async deletePaymentMethod(body: Partial<IPaymentMethod>) {

		const { PaymentMethodId } = body;

		const url = this.cardknoxUrl.DeleteMethod;

		const requestBody = {
			"SoftwareName": process.env.CARDKNOX_SOFTWARE_NAME,
			"SoftwareVersion": process.env.CARDKNOX_SOFTWARE_VERSION,
			"PaymentMethodId": PaymentMethodId,
		}
		const headers = {
			'X-Recurring-Api-Version': '2.1',
			'Authorization': process.env.CARDKNOX_KEY
		}

		await this.http.post(url, requestBody, { headers }).toPromise();
	}

}