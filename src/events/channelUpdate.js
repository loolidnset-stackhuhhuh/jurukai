
import { Events, AuditLogEvent } from 'discord.js';
import { checkAntiNuke } from '../services/antinukeService.js';

export default {
    name: Events.ChannelUpdate,

    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;

        const guild = newChannel.guild;

        try {
            const oldOverwrites = oldChannel.permissionOverwrites.cache;
            const newOverwrites = newChannel.permissionOverwrites.cache;

            const changed =
                oldOverwrites.size !== newOverwrites.size ||
                [...oldOverwrites.values()].some(oldOverwrite => {
                    const newOverwrite = newOverwrites.get(oldOverwrite.id);

                    return (
                        !newOverwrite ||
                        oldOverwrite.allow.bitfield !== newOverwrite.allow.bitfield ||
                        oldOverwrite.deny.bitfield !== newOverwrite.deny.bitfield ||
                        oldOverwrite.type !== newOverwrite.type
                    );
                });

            if (!changed) return;

            const auditTypes = [
                AuditLogEvent.ChannelOverwriteCreate,
                AuditLogEvent.ChannelOverwriteUpdate,
                AuditLogEvent.ChannelOverwriteDelete,
            ];

            let matchingEntry = null;

            for (const type of auditTypes) {
                const auditLogs = await guild.fetchAuditLogs({
                    type,
                    limit: 5,
                });

                const entry = auditLogs.entries.find(entry =>
                    entry.extra?.channel?.id === newChannel.id &&
                    entry.executor &&
                    Date.now() - entry.createdTimestamp < 15000
                );

                if (
                    entry &&
                    (!matchingEntry ||
                        entry.createdTimestamp > matchingEntry.createdTimestamp)
                ) {
                    matchingEntry = entry;
                }
            }

            if (!matchingEntry?.executor) return;

            await checkAntiNuke({
                guild,
                executor: matchingEntry.executor,
                action: 'channelUpdate',
                auditAction: matchingEntry.action,
            });

        } catch (error) {
            console.error(
                '[ALTARE ANTINUKE] Channel permission detection failed:',
                error
            );
        }
    },
};
