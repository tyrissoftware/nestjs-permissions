# nestjs-permissions

![GIT](https://img.shields.io/badge/GIT-black?style=for-the-badge&logo=GIT&logoColor=F05032)![JS](https://img.shields.io/badge/JAVASCRIPT-black?style=for-the-badge&logo=JavaScript&logoColor=F7DF1E)![TS](https://img.shields.io/badge/TYPESCRIPT-black?style=for-the-badge&logo=TypeScript&logoColor=3178C6)

This library is extends Permission Roles in NestJS to ACL. For now, only works on MongoDB

## How to use
You need:
Schema `user` with the role Id(s) of the user (the permissions are aggregated):
```typescript
@Schema()
export class User {
...
    roles: roleId | roleId[]
}
```
Schema `role` with the actionIds allowed in the `permissions` property
```typescript
@Schema()
export class Role  {
...
    permissions: Permission[]
}
```

Create a Guard in your project, with inherits from PermissionsGuardBase
```typescript
@Injectable()
export class PermissionsGuard extends PermissionsGuardBase implements CanActivate {
    constructor(reflector: Reflector, @InjectModel(User.name) userModel: Model<User>) {
        super(reflector, userModel as Model<unknown>, 
            {
                roleModelName: Role.name, 
                rolePath: "roles", 
                permissionsProperty: "permissions"
            }
        )
    }
}
```
you need to pass the `reflector`, `mongoose model of users`  and the `IConfig` with the properties of your database
Add it to your `app.module` on `providers`
```typescript
        {
            provide: APP_GUARD,
            useClass: PermissionsGuard
        }
```

so, this is an example in your DB:

* User:
```json
[
    {
        "_id": 1,
        "username": "test1",
        "password": "x",
        "roles":["a","b"]
    },
    {
        "_id": 2,
        "username": "test2",
        "password": "x",
        "roles":["a"]
    },
    {
        "_id": 3,
        "username": "test3",
        "password": "x",
        "roles":["b"]
    }
]
```
* Role:
```json
[
    {
        "_id": "a",
        "name": "role a",
        "permissions": [
            {
                "action": "gett",
                "entity": "test"
            }]
    },
    {
        "_id": "b",
        "name": "role b",
        "permissions": [
            {
                "action": "putt",
                "entity": "test"
            }]
    }
]
```

Use the decorator `@Permissions(IRolePermission)` to mark what permission needs an endpoint:
```typescript
@Controller("test")
export class TestController {
 @Get()
 @Permissions({ "action": "gett", "entity": "test"})
 async getAllowed() {
     return "you have the right permission for get";
 }
 @Put()
 @Permissions({ "action": "putt", "entity": "test"})
 async putAllowed() {
     return "you have the right permission for put";
 }
}
```
So, if you configure all properly, user "test1" can access both endpoints. "test2" can access only to `getAllowed` and "test3" only can access to `putAllowed`

you can define your own actions and entities. It"s good to use `enum` for them
