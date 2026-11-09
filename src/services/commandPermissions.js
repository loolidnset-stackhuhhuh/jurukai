export async function checkCommandPermission(message, command) {
    const warning = '<:warning:1562130172004540439>';
    const user = message.author.toString();

    if (message.author.id === message.guild.ownerId) {
        return { allowed: true };
    }

    const group = getPermissionGroup(command.name);

    if (!group) {
        return { allowed: true };
    }

    let roleIds;

    try {
        roleIds = await getCommandRoles(
            message.guild.id,
            command.name
        );
    } catch (error) {
        console.error('[JURUMI] Permission lookup failed:', error);

        return {
            allowed: false,
            message: `${warning} ${user}: You're **missing** the permission: \`database_access\``
        };
    }

    if (!roleIds.length) {
        return {
            allowed: false,
            message: `${warning} ${user}: You're **missing** the permission: \`${command.name}_role\``
        };
    }

    const hasRole = roleIds.some(roleId =>
        message.member.roles.cache.has(roleId)
    );

    if (!hasRole) {
        return {
            allowed: false,
            message: `${warning} ${user}: You're **missing** the permission: \`${command.name}_role\``
        };
    }

    return { allowed: true };
}
