import mongoose from "mongoose";

export interface IReceipt {
	id: string;
	name: string;
	mimeType: string;
	size: number;
}

export interface IExpense {
	_id: string | mongoose.Types.ObjectId;
	month: number;
	year: number;
	paymentDay: string;
	description: string;
	isPaid: boolean;
	addedBy: string | mongoose.Types.ObjectId;
	isApproved: boolean;
	approvedBy?: string | mongoose.Types.ObjectId | null;
	receipt?: IReceipt[];
	unit?: string | mongoose.Types.ObjectId | null;
	property?: string | mongoose.Types.ObjectId | null;
	company?: string | mongoose.Types.ObjectId | null;
	createdAt: Date;
	updatedAt: Date;
}
