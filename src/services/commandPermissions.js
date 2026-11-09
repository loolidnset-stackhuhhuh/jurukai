
import { permissionConfig } from '../config/permissions.js';
import { getDatabase } from '../database/connection.js';

export function getPermissionGroup(commandName) {
    for (const [group, commands] of Object.entries(
        permissionConfig.permissionGroups
    )) {
        if (commands.includes(commandName.toLowerCase())) {
            return group;
        }
    }

    return null;
}

export async function getCommandRoles(guildId, commandName) {
    const db = getDatabase();

    const result = await db.query(
        `SELECT role_id
         FROM command_role_permissions
         WHERE guild_id = $1 AND command_name = $2`,
        [guildId, commandName.toLowerCase()]
    );

    return result.rows.map(row => row.role_id);
}

export async function setCommandRoles(guildId, commandName, roleIds) {
    const db = getDatabase();
    const normalizedName = commandName.toLowerCase();

    await db.query(
        `DELETE FROM command_role_permissions
         WHERE guild_id = $1 AND command_name = $2`,
        [guildId, normalizedName]
    );

    for (const roleId of roleIds) {
        await db.query(
            `INSERT INTO command_role_permissions
             (guild_id, command_name, role_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [guildId, normalizedName, roleId]
        );
    }
}

export async function checkCommandPermission(message, command) {
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
            reason: 'Jurumi cannot access its permission database right now.'
        };
    }

    if (!roleIds.length) {
        return {
            allowed: false,
            reason: `No staff role has been assigned to ,${command.name} yet. Ask the server owner to configure it.`
        };
    }

    const hasRole = roleIds.some(roleId =>
        message.member.roles.cache.has(roleId)
    );

    if (!hasRole) {
        return {
            allowed: false,
            reason: 'You do not have a role authorized to use this command.'
        };
    }

    return { allowed: true };
}
