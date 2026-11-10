
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.GuildMemberAdd,

    async execute(member, client) {
        if (!member.user.bot) return;

        const guild = member.guild;

        try {
            // Give Discord a moment to publish the audit log entry.
            await new Promise(resolve => setTimeout(resolve, 1000));

            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.BotAdd,
                limit: 5,
            });

            const entry = auditLogs.entries.find(entry =>
                entry.target?.id === member.id &&
                Date.now() - entry.createdTimestamp < 15000
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'botAdd',
                auditAction: AuditLogEvent.BotAdd,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Bot addition detection failed:',
                error
            );
        }
    },
};
