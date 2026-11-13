
import {
    Events,
    AuditLogEvent,
    PermissionsBitField
} from 'discord.js';

import {
    checkAntiNuke
} from '../services/antinukeService.js';

const DANGEROUS_PERMISSIONS = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'ManageWebhooks',
    'BanMembers',
    'KickMembers',
    'ManageMessages',
    'ManageThreads',
    'ModerateMembers',
    'MentionEveryone',
    'ManageEvents',
    'ManageGuildExpressions',
    'ManageGuildScheduledEvents',
    'ManageNicknames',
    'ViewAuditLog'
];

export default {
    name: Events.GuildRoleUpdate,

    async execute(oldRole, newRole) {
        const guild = newRole.guild;

        try {
            const addedDangerousPermissions =
                DANGEROUS_PERMISSIONS.some(permissionName => {
                    const permission =
                        PermissionsBitField.Flags[permissionName];

                    if (permission === undefined) return false;

                    return (
                        newRole.permissions.has(permission) &&
                        !oldRole.permissions.has(permission)
                    );
                });

            if (!addedDangerousPermissions) return;

            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.RoleUpdate,
                limit: 5
            });

            const entry = auditLogs.entries.find(entry =>
                entry.target?.id === newRole.id &&
                Date.now() - entry.createdTimestamp < 15000
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'roleUpdate',
                auditAction: AuditLogEvent.RoleUpdate
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Role permission detection failed:',
                error
            );
        }
    }
};
