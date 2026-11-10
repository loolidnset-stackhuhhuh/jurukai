
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

const WEBHOOK_ACTIONS = [
    {
        type: AuditLogEvent.WebhookCreate,
        name: 'Webhook Creation'
    },
    {
        type: AuditLogEvent.WebhookDelete,
        name: 'Webhook Deletion'
    },
    {
        type: AuditLogEvent.WebhookUpdate,
        name: 'Webhook Modification'
    }
];

export default {
    name: Events.WebhooksUpdate,

    async execute(channel, client) {
        if (!channel.guild) return;

        const guild = channel.guild;

        try {
            const results = await Promise.all(
                WEBHOOK_ACTIONS.map(async action => {
                    try {
                        const logs = await guild.fetchAuditLogs({
                            type: action.type,
                            limit: 5
                        });

                        return logs.entries
                            .filter(entry =>
                                entry.extra?.channel?.id === channel.id &&
                                Date.now() - entry.createdTimestamp < 15000 &&
                                entry.executor
                            )
                            .map(entry => ({
                                entry,
                                action
                            }));

                    } catch (error) {
                        console.error(
                            `[ALTARE ANTINUKE] Failed to fetch ${action.name} audit logs:`,
                            error
                        );

                        return [];
                    }
                })
            );

            const matches = results
                .flat()
                .sort((a, b) =>
                    b.entry.createdTimestamp -
                    a.entry.createdTimestamp
                );

            // Only process the newest matching audit entry.
            const detected = matches[0];

            if (!detected) return;

            await checkAntiNuke({
                guild,
                executor: detected.entry.executor,
                action: 'webhook',
                auditAction: detected.action.type
            });

            console.log(
                `[ALTARE ANTINUKE] ${detected.action.name} detected in ${guild.name}.`
            );

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Webhook detection failed:',
                error
            );
        }
    }
};
