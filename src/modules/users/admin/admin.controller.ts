import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './services/admin.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { USER_ROLE } from '../users.constant';
import { AddUserDto } from '../users.validation';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response_message.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLE.admin)
export class AdminController {

	constructor(
		private adminService: AdminService
	) { }

	@Post('add-user')
	@ApiBody({ type: AddUserDto })
	@ResponseMessage("Company added successfully")
	async addCompany(
		@Body() body: AddUserDto
	) {
		return await this.adminService.adduser(body);
	}
}
