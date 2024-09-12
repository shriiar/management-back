interface ICreateCustomer {
	RefNum: string,
	Result: "S" | "E",
	Error: string,
	CustomerId: string
}