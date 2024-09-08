import { SetMetadata } from '@nestjs/common';
import { TUserRole } from 'src/modules/users/users.interface';

export const Roles = (...requiredRoles: TUserRole[]) => SetMetadata('roles', requiredRoles);