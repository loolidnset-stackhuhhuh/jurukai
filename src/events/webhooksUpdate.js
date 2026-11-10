
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.WebhooksUpdate,

    async execute(channel, client) {
        if (!channel.guild) return;

        const guild = channel.guild;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.WebhookCreate,
                limit: 5,
            });

            const entry = auditLogs.entries.find(entry =>
                Date.now() - entry.createdTimestamp < 15000 &&
                entry.extra?.channel?.id === channel.id
            );

            if (!entry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: entry.executor,
                action: 'webhook',
                auditAction: AuditLogEvent.WebhookCreate,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Webhook detection failed:',
                error
            );
        }
    },
};
