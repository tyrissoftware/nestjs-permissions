import { SetMetadata } from '@nestjs/common';
import { IRolePermission } from '../interfaces/irole-permission';

export const Permissions = (...permissions: IRolePermission[]) => SetMetadata('permissions', permissions);
