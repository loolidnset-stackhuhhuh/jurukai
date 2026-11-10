
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.GuildRoleDelete,

    async execute(role, client) {
        const guild = role.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.RoleDelete,
                limit: 5,
            });

            const entry = auditLogs.entries.find(entry =>
                entry.target?.id === role.id &&
                Date.now() - entry.createdTimestamp < 15000
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'roleDelete',
                auditAction: AuditLogEvent.RoleDelete,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Role deletion detection failed:',
                error
            );
        }
    },
};
