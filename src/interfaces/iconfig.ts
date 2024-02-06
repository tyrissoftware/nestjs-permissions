
/**
 * This interface is for config the guard.
 * @param roleModelName is the collection of the roles
 * @param rolePath is the property of the roles in the user object
 * @param permissionsProperty: is the property with the Permissions in the roleModelName collection object
 * @param cachePrefix: prefix for cache key. The cacheKey will be cachePrefix + userId
 * @param cacheTtl: Cache TTL (in ms) 30000 = 30s
 * @param verbose: show debug messages
 */
export interface IConfig {
    roleModelName?: string,
    rolePath?: string,
    permissionsProperty?: string,
    cachePrefix?: string,
    cacheTtl?: number,
    verbose?: boolean
}