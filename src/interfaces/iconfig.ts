
/**
 * This interface is for config the guard.
 * @param roleModelName is the collection of the roles
 * @param rolePath is the property of the roles in the user object
 * @param permissionsProperty: is the property with the Permissions in the roleModelName collection object
 */
export interface IConfig {
    roleModelName?: string,
    rolePath?: string,
    permissionsProperty?: string
}