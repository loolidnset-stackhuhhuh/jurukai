
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.GuildBanAdd,

    async execute(ban, client) {
        const guild = ban.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 5,
            });

            const entry = auditLogs.entries.find(entry =>
                entry.target?.id === ban.user.id &&
                Date.now() - entry.createdTimestamp < 15000
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'ban',
                auditAction: AuditLogEvent.MemberBanAdd,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Ban detection failed:',
                error
            );
        }
    },
};
