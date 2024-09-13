interface ICustomer {
	RefNum: string,
	Result: "S" | "E",
	Error: string,
	CustomerId: string
}

interface IToken {
	xResult: 'A' | 'E';
	xStatus: string;
	xError?: string;
	xErrorCode?: string;
	xRefNum: string;
	xExp?: string;
	xDate: string;
	xToken?: string;
	xMaskedCardNumber?: string;
	xCardType?: string;
	xName?: string;
}

interface IPaymentMethod {
	RefNum: string;
	Result: 'E' | 'S';
	Error?: string;
	PaymentMethodId?: string;
}

interface IOneTimePayment {
	RefNum: string;
	Result: 'E' | 'S';
	Error?: string;
	GatewayRefNum?: string;
	GatewayStatus?: string;
	GatewayErrorMessage?: string;
}
