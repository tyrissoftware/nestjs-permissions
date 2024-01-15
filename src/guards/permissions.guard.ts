import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Model } from 'mongoose';
import { intersectionWith, isEqual, flatten, map} from 'lodash';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, 
    private userModel: Model<unknown>,
    private roleModel: string,
    private controllersWithNoAuth?: string[]) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.controllersWithNoAuth?.indexOf(context.getClass().name) >= 0) {return true;}
    let neededPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!neededPermissions) {neededPermissions = this.reflector.get<string[]>('permissions', context.getClass());}
    if (!neededPermissions) {return true;}
    const user = context.switchToHttp().getRequest().user;
    const users = await this.userModel.find({_id: user?.id}).populate(
      {
        path: 'roles',
        model: this.roleModel,
      }
    ).lean();
    if(!users || users.length === 0) {
      throw new Error(`*** I cant find the user (roles) ${JSON.stringify(user)}`);
    }
    const userPermissions = flatten(map((users[0] as any).roles, 'permissions'));
    
    return this.matchRoles(neededPermissions, userPermissions);
  }

  matchRoles(roles: string[], userRoles: any): boolean {
    if (!userRoles && roles.length > 0) {return false;}
    if (intersectionWith(roles, userRoles, isEqual).length > 0) {
      return true;
    }
    return false;
  }
}
