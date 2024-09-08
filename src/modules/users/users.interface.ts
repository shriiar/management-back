import { USER_ROLE } from "./users.constant";

export interface IUser {
	// initials 
	_id?: string;
	name: string;
	email: string;
	password: string;

	// booleans
	isVerified?: boolean;
	isBlocked?: boolean;
	isDeleted?: boolean;

	settings?: IUserSettings;

	role?: string;
	imageUrl?: string;
}

export interface IFullUser extends IUser {
	// initials 
	_id: string;
	role: string;

	// booleans
	isVerified: boolean;
	isBlocked: boolean;
	isDeleted: boolean;

	settings: IUserSettings;

	timezone: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface IUserSettings {
	isGetEmail: boolean;
	isGetNotification: boolean;
}

export type TUserRole = keyof typeof USER_ROLE;