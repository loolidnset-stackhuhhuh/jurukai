
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.GuildMemberRemove,

    async execute(member, client) {
        const guild = member.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 5,
            });

            const entry = auditLogs.entries.find(entry =>
                entry.target?.id === member.id &&
                Date.now() - entry.createdTimestamp < 10000
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'kick',
                auditAction: AuditLogEvent.MemberKick,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Kick detection failed:',
                error
            );
        }
    },
};
