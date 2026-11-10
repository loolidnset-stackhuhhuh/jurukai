
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.ChannelDelete,

    async execute(channel, client) {
        if (!channel.guild) return;

        const guild = channel.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 5,
            });

            const entry = auditLogs.entries.find(entry =>
                entry.target?.id === channel.id &&
                Date.now() - entry.createdTimestamp < 15000
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'channelDelete',
                auditAction: AuditLogEvent.ChannelDelete,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Channel deletion detection failed:',
                error
            );
        }
    },
};
