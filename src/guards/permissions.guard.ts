import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types, Model } from 'mongoose';
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
    let neededPermissions = this.isPermissionsNeeded(context);
    if (!neededPermissions) {
      return true;
    }
    const user = this.getUser(context);
    if (!user) {
      throw new Error(`*** I can't find the user`);
    }
    const id = this.getUserId(user);
    const users = await this.getUsers(id);

    if(!users || users.length === 0) {
      throw new Error(`*** I can't find the user (roles) ${JSON.stringify(user)}`);
    }
    
    const userPermissions = flatten(map((users[0] as any)[this.config.rolePath], this.config.permissionsProperty));
    
    return this.matchRoles(neededPermissions, userPermissions);
  }

  private getUser(context: ExecutionContext) {
    return context.switchToHttp().getRequest().user
  }

  private getUserId(user: any) {
    let id = user.id;
    if (!id && user._id) {
      id = user._id;
    }
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      id = new Types.ObjectId(id);
    }
    return id;
  }

  private isPermissionsNeeded(context: ExecutionContext) {
    let neededPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!neededPermissions) { 
      neededPermissions = this.reflector.get<string[]>('permissions', context.getClass()); 
    }
    return neededPermissions;
  }

  private async getUsers(id: unknown) {
    return this.userModel.find({_id: id }).populate(
      {
        path: this.config.rolePath,
        model: this.config.roleModelName,
      }
    ).lean();
  }

  private matchRoles(roles: string[], userRoles: any): boolean {
    if (!userRoles && roles.length > 0) {return false;}
    if (intersectionWith(roles, userRoles, isEqual).length > 0) {
      return true;
    }
    return false;
  }
}

