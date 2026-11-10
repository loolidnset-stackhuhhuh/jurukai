
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.GuildRoleCreate,

    async execute(role, client) {
        const guild = role.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.RoleCreate,
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
                action: 'roleCreate',
                auditAction: AuditLogEvent.RoleCreate,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Role creation detection failed:',
                error
            );
        }
    },
};
