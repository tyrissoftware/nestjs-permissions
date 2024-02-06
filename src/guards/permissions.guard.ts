import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types, Model } from 'mongoose';
import { intersectionWith, isEqual, flatten, map} from 'lodash';
import { IConfig } from '../interfaces/iconfig';
import { Cache } from '@nestjs/cache-manager';
export class PermissionsGuardBase implements CanActivate {
  /**
   * 
   * @param reflector reflector, injected by nestjs
   * @param userModel Mongoose model for users
   * @param cacheService: nestjs Cache Service, for using memory cache (recommended)
   * @param config configuration of the Guard
   * @param controllersWithNoAuth optional, use for some controllers without permissions
   
   */
  constructor(protected reflector: Reflector, 
    protected userModel: Model<unknown>,
    protected cacheService?: Cache,
    private config?: IConfig,
    private controllersWithNoAuth?: string[],
    ) {
    if (!config) {
      this.config = {
        roleModelName: 'Role',
        rolePath: 'roles',
        permissionsProperty:  'permissions',
        cachePrefix: 'UserPermission_',
        cacheTtl: 30000
      }
    }
    if (!this.config.roleModelName) this.config.roleModelName = 'Role';
    if (!this.config.rolePath) this.config.rolePath = 'roles';
    if (!this.config.permissionsProperty) this.config.permissionsProperty = 'permissions';
    if (!this.config.cachePrefix) this.config.cachePrefix = 'UserPermission_';
    if (!this.config.cacheTtl) this.config.cacheTtl = 30000;

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
    if (this.config.verbose){
      console.log(`** getting userID for ${JSON.stringify(user)}`)
    }
    const id = this.getUserId(user);
    if (this.config.verbose){
      console.log(`** getting getUserWithPermissions for ${id}`)
    }
    const users = await this.getUserWithPermissions(id);

    if(!users) {
      throw new Error(`*** I can't find the user (roles) ${JSON.stringify(user)}`);
    }
    if (this.config.verbose){
      console.log(`** getting userPermissions for ${JSON.stringify(users)}`)
    }
    const userPermissions = flatten(map((users as any)[this.config.rolePath], this.config.permissionsProperty));
    if (this.config.verbose){
      console.log(`** getting matchRoles for userPermissions-- neededPermissions`)
      console.group(userPermissions)
      console.group(neededPermissions)
    }
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

  private async getUserWithPermissions(id: unknown) {
    let user: unknown;
    const cacheId = `${this.config.cachePrefix}${id.toString()}`;
    if (this.cacheService) {
      if (this.config.verbose){
        console.log(`*** getting user from cache ${id}`)
      }
      user = await this.cacheService.get(cacheId);
    }
    if (!user) {
      if (this.config.verbose){
        console.log(`*** finding user ${id}`)
      }
      user = await this.userModel.findById(id).populate(
        {
          path: this.config.rolePath,
          model: this.config.roleModelName,
        }
      ).lean();
    }
    if (this.cacheService) {
      if (this.config.verbose){
        console.log(`*** saving user to cache ${id}`)
      }
      this.cacheService.set(cacheId, user, this.config.cacheTtl).then().catch(ex => {
        console.error('** error setting user in cache', [ex.message, user]);
      });
    }
    return user;
  }

  private matchRoles(roles: string[], userRoles: any): boolean {
    if (!userRoles && roles.length > 0) {return false;}
    if (intersectionWith(roles, userRoles, isEqual).length > 0) {
      return true;
    }
    return false;
  }
}

