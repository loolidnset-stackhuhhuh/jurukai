
import { PermissionFlagsBits } from 'discord.js';
import { getDatabase } from '../database/connection.js';
import { permissionConfig } from '../config/permissions.js';

const WARNING = '<:warning:1562130172004540439>';

const permissionNames = Object.fromEntries(
    Object.entries(PermissionFlagsBits).map(([name, value]) => [
        value,
        name.toLowerCase().replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    ])
);

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

    return roleIds;
}

export async function checkCommandPermission(message, command) {
    const user = message.author.toString();

    const deny = permission => ({
        allowed: false,
        message: `${WARNING} ${user}: You're **missing** the permission: \`${permission}\``
    });

    if (message.author.id === message.guild.ownerId) {
        return { allowed: true };
    }

    if (command.requiredPermission) {
        const required = command.requiredPermission;
        const permissionKey =
            permissionNames[required] ??
            (typeof required === 'string' ? required.toLowerCase() : null);

        const hasPermission = message.member.permissions.has(required);

        if (!hasPermission) {
            return deny(permissionKey ?? 'required_permission');
        }
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
            message: 'Jurumi could not check command permissions because the database is unavailable.'
        };
    }

    if (!roleIds.length) {
        return deny(`${command.name}_role`);
    }

    const hasRole = roleIds.some(roleId =>
        message.member.roles.cache.has(roleId)
    );

    if (!hasRole) {
        return deny(`${command.name}_role`);
    }

    return { allowed: true };
}
