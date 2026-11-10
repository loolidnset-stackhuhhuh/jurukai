
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.ChannelCreate,

    async execute(channel, client) {
        if (!channel.guild) return;

        const guild = channel.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelCreate,
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
                action: 'channelCreate',
                auditAction: AuditLogEvent.ChannelCreate,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Channel creation detection failed:',
                error
            );
        }
    },
};
