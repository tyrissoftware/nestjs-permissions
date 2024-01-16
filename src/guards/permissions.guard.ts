import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Model } from 'mongoose';
import { intersectionWith, isEqual, flatten, map} from 'lodash';
export class PermissionsGuardBase implements CanActivate {
  /**
   * 
   * @param reflector reflector, injected by nestjs
   * @param userModel Mongoose model for users
   * @param roleModelName RoleModel name, used for populate
   * @param controllersWithNoAuth optional, use for some controllers without permissions
   */
  constructor(protected reflector: Reflector, 
    protected userModel: Model<unknown>,
    private roleModelName: string,
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
        model: this.roleModelName,
      }
    ).lean();
    if(!users || users.length === 0) {
      throw new Error(`*** I cant find the user (roles) ${JSON.stringify(user)}`);
    }
    const userPermissions = flatten(map((users[0] as any).roles, 'permissions'));
    
    return this.matchRoles(neededPermissions, userPermissions);
  }

  private matchRoles(roles: string[], userRoles: any): boolean {
    if (!userRoles && roles.length > 0) {return false;}
    if (intersectionWith(roles, userRoles, isEqual).length > 0) {
      return true;
    }
    return false;
  }
}
