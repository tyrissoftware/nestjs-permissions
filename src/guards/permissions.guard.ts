import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Model } from 'mongoose';
import { intersectionWith, isEqual, flatten, map} from 'lodash';
import { IConfig } from '../interfaces/iconfig';
export class PermissionsGuardBase implements CanActivate {
  /**
   * 
   * @param reflector reflector, injected by nestjs
   * @param userModel Mongoose model for users
   * @param config configuration of the Guard
   * @param controllersWithNoAuth optional, use for some controllers without permissions
   */
  constructor(protected reflector: Reflector, 
    protected userModel: Model<unknown>,
    private config?: IConfig,
    private controllersWithNoAuth?: string[]) {
    if (!config) {
      this.config = {
        roleModelName: 'Role',
        rolePath: 'roles',
        permissionsProperty:  'permissions'
      }
    }
    if (!this.config.roleModelName) this.config.roleModelName = 'Role';
    if (!this.config.rolePath) this.config.rolePath = 'roles';
    if (!this.config.permissionsProperty) this.config.permissionsProperty = 'permissions';
    }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.controllersWithNoAuth?.indexOf(context.getClass().name) >= 0) {return true;}
    let neededPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!neededPermissions) {neededPermissions = this.reflector.get<string[]>('permissions', context.getClass());}
    if (!neededPermissions) {return true;}
    const user = context.switchToHttp().getRequest().user;
    const users = await this.userModel.find({_id: user?.id}).populate(
      {
        path: this.config.rolePath,
        model: this.config.roleModelName,
      }
    ).lean();
    if(!users || users.length === 0) {
      throw new Error(`*** I cant find the user (roles) ${JSON.stringify(user)}`);
    }
    const userPermissions = flatten(map((users[0] as any)[this.config.rolePath], this.config.permissionsProperty));
    
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

