
import {
    AuditLogEvent
} from 'discord.js';

import {
    getAntiNukeData,
    saveAntiNukeData,
    getAntiNukeWhitelist,
    addAntiNukeWhitelist as saveWhitelistUser,
    removeAntiNukeWhitelist as deleteWhitelistUser,
    getAntiNukeAdmins,
    addAntiNukeAdmin as saveAdminUser,
    removeAntiNukeAdmin as deleteAdminUser,
    getAntiNukeBlacklist,
    addAntiNukeBlacklist as saveBlacklistedUser,
    removeAntiNukeBlacklist as deleteBlacklistedUser
} from '../database/antinuke.js';

const DEFAULT_SETTINGS = {
    enabled: false,
    punishment: 'strip',
    logChannel: null,

    protections: {
        channelDelete: true,
        channelCreate: true,
        roleDelete: true,
        roleCreate: true,
        ban: true,
        kick: true,
        webhook: true,
        botAdd: true
    },

    thresholds: {
        channelDelete: { limit: 2, interval: 10000 },
        channelCreate: { limit: 5, interval: 10000 },
        roleDelete: { limit: 2, interval: 10000 },
        roleCreate: { limit: 5, interval: 10000 },
        ban: { limit: 3, interval: 10000 },
        kick: { limit: 4, interval: 10000 },
        webhook: { limit: 2, interval: 10000 },
        botAdd: { limit: 1, interval: 10000 }
    }
};

const settingsCache = new Map();
const whitelistCache = new Map();
const adminCache = new Map();
const blacklistCache = new Map();
const actionHistory = new Map();
const punishmentCooldowns = new Map();

const PUNISHMENT_COOLDOWN = 60000;

function mergeSettings(saved = {}) {
    return {
        ...structuredClone(DEFAULT_SETTINGS),
        ...saved,
        protections: {
            ...DEFAULT_SETTINGS.protections,
            ...(saved.protections || {})
        },
        thresholds: {
            ...DEFAULT_SETTINGS.thresholds,
            ...(saved.thresholds || {})
        }
    };
}

async function loadSettings(guildId) {
    if (settingsCache.has(guildId)) {
        return settingsCache.get(guildId);
    }

    const saved = await getAntiNukeData(guildId);
    const settings = mergeSettings(saved || {});

    settingsCache.set(guildId, settings);

    if (!saved) {
        await saveAntiNukeData(guildId, settings);
    }

    return settings;
}

async function loadWhitelist(guildId) {
    if (whitelistCache.has(guildId)) {
        return whitelistCache.get(guildId);
    }

    const users = await getAntiNukeWhitelist(guildId);

    whitelistCache.set(guildId, users);

    return users;
}

async function loadAdmins(guildId) {
    if (adminCache.has(guildId)) {
        return adminCache.get(guildId);
    }

    const users = await getAntiNukeAdmins(guildId);

    adminCache.set(guildId, users);

    return users;
}

async function loadBlacklist(guildId) {
    if (blacklistCache.has(guildId)) {
        return blacklistCache.get(guildId);
    }

    const users = await getAntiNukeBlacklist(guildId);

    blacklistCache.set(guildId, users);

    return users;
}

async function persistSettings(guildId, settings) {
    await saveAntiNukeData(guildId, settings);
    settingsCache.set(guildId, settings);

    return settings;
}

// SETTINGS

export async function configureAntiNuke(guildId, updates = {}) {
    const settings = await loadSettings(guildId);

    if (updates.enabled !== undefined) {
        settings.enabled = Boolean(updates.enabled);
    }

    if (updates.punishment) {
        const allowed = ['strip', 'ban', 'kick', 'timeout'];

        if (!allowed.includes(updates.punishment)) {
            throw new Error('Invalid Anti-Nuke punishment.');
        }

        settings.punishment = updates.punishment;
    }

    if (updates.logChannel !== undefined) {
        settings.logChannel = updates.logChannel;
    }

    if (updates.protections) {
        Object.assign(settings.protections, updates.protections);
    }

    if (updates.thresholds) {
        Object.assign(settings.thresholds, updates.thresholds);
    }

    return persistSettings(guildId, settings);
}

export async function getAntiNukeSettings(guildId) {
    return loadSettings(guildId);
}

// WHITELIST

export async function addAntiNukeWhitelist(guildId, userId) {
    await saveWhitelistUser(guildId, userId);

    const users = await getAntiNukeWhitelist(guildId);

    whitelistCache.set(guildId, users);

    return users;
}

export async function removeAntiNukeWhitelist(guildId, userId) {
    await deleteWhitelistUser(guildId, userId);

    const users = await getAntiNukeWhitelist(guildId);

    whitelistCache.set(guildId, users);

    return users;
}

export async function getAntiNukeWhitelistUsers(guildId) {
    return loadWhitelist(guildId);
}

export async function isWhitelisted(guild, userId) {
    if (userId === guild.ownerId) return true;

    const users = await loadWhitelist(guild.id);

    return users.includes(userId);
}

// ANTINUKE ADMINS

export async function addAntiNukeAdmin(guildId, userId) {
    await saveAdminUser(guildId, userId);

    const users = await getAntiNukeAdmins(guildId);

    adminCache.set(guildId, users);

    return users;
}

export async function removeAntiNukeAdmin(guildId, userId) {
    await deleteAdminUser(guildId, userId);

    const users = await getAntiNukeAdmins(guildId);

    adminCache.set(guildId, users);

    return users;
}

export async function getAntiNukeAdminUsers(guildId) {
    return loadAdmins(guildId);
}

export async function isAntiNukeAdmin(guildId, userId) {
    const admins = await loadAdmins(guildId);

    return admins.includes(userId);
}

// ANTINUKE BLACKLIST

export async function addAntiNukeBlacklist(guildId, userId) {
    await saveBlacklistedUser(guildId, userId);

    const users = await getAntiNukeBlacklist(guildId);

    blacklistCache.set(guildId, users);

    return users;
}

export async function removeAntiNukeBlacklist(guildId, userId) {
    await deleteBlacklistedUser(guildId, userId);

    const users = await getAntiNukeBlacklist(guildId);

    blacklistCache.set(guildId, users);

    return users;
}

export async function getAntiNukeBlacklistUsers(guildId) {
    return loadBlacklist(guildId);
}

export async function isAntiNukeBlacklisted(guildId, userId) {
    const users = await loadBlacklist(guildId);

    return users.includes(userId);
}

// STRIP ROLES FROM BLACKLISTED USERS

export async function stripBlacklistedUser(member) {
    if (!member?.guild || !member?.user) {
        return {
            success: false,
            removed: 0,
            reason: 'Member not found.'
        };
    }

    const guild = member.guild;

    if (member.id === guild.ownerId) {
        return {
            success: false,
            removed: 0,
            reason: 'Server owner is protected.'
        };
    }

    if (!member.manageable) {
        return {
            success: false,
            removed: 0,
            reason: 'The bot cannot manage this member because of role hierarchy.'
        };
    }

    const removableRoles = member.roles.cache.filter(role =>
        role.id !== guild.id &&
        !role.managed &&
        role.editable
    );

    if (!removableRoles.size) {
        return {
            success: false,
            removed: 0,
            reason: 'No removable roles were found.'
        };
    }

    try {
        await member.roles.remove(
            removableRoles,
            'Anti-Nuke: Blacklisted user attempted to use an Anti-Nuke command.'
        );

        return {
            success: true,
            removed: removableRoles.size,
            reason: 'Roles removed.'
        };
    } catch (error) {
        console.error(
            '[ALTARE ANTINUKE] Blacklist role removal failed:',
            error
        );

        return {
            success: false,
            removed: 0,
            reason: 'Discord rejected the role removal.'
        };
    }
}

// AUTOMATIC ANTINUKE PUNISHMENT

async function punishExecutor(guild, executor, settings) {
    const member = await guild.members.fetch(executor.id)
        .catch(() => null);

    if (!member) return 'Executor not found';

    if (member.id === guild.ownerId) {
        return 'Owner protected';
    }

    if (
        !member.moderatable &&
        settings.punishment !== 'ban' &&
        settings.punishment !== 'kick'
    ) {
        return 'Executor cannot be moderated';
    }

    switch (settings.punishment) {
        case 'ban':
            if (!member.bannable) return 'Cannot ban executor';

            await member.ban({
                reason: 'Altare Anti-Nuke: Suspicious destructive activity.'
            });

            return 'Banned';

        case 'kick':
            if (!member.kickable) return 'Cannot kick executor';

            await member.kick(
                'Altare Anti-Nuke: Suspicious destructive activity.'
            );

            return 'Kicked';

        case 'timeout':
            if (!member.moderatable) return 'Cannot timeout executor';

            await member.timeout(
                60 * 60 * 1000,
                'Altare Anti-Nuke: Suspicious destructive activity.'
            );

            return 'Timed out for 1 hour';

        case 'strip': {
            if (!member.manageable) {
                return 'Cannot remove executor roles';
            }

            const roles = member.roles.cache.filter(role =>
                role.id !== guild.id &&
                !role.managed &&
                role.editable
            );

            if (!roles.size) return 'No removable roles';

            await member.roles.remove(
                roles,
                'Altare Anti-Nuke: Suspicious destructive activity.'
            );

            return 'Removable roles stripped';
        }

        default:
            return 'No punishment applied';
    }
}

async function sendAntiNukeLog(
    guild,
    executor,
    action,
    count,
    punishment
) {
    const settings = await loadSettings(guild.id);

    if (!settings.logChannel) return;

    const channel = await guild.channels.fetch(settings.logChannel)
        .catch(() => null);

    if (!channel?.isTextBased() || !channel.send) return;

    await channel.send({
        embeds: [{
            color: 0xff69b4,
            title: 'Altare | Anti-Nuke Triggered',
            fields: [
                {
                    name: 'Executor',
                    value: `${executor.tag || executor.username} (\`${executor.id}\`)`
                },
                {
                    name: 'Detected Action',
                    value: action,
                    inline: true
                },
                {
                    name: 'Actions Detected',
                    value: String(count),
                    inline: true
                },
                {
                    name: 'Punishment',
                    value: punishment
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Altare Security System'
            }
        }],
        allowedMentions: { parse: [] }
    }).catch(error => {
        console.error('[ALTARE ANTINUKE] Log error:', error);
    });
}

export async function checkAntiNuke({
    guild,
    executor,
    action,
    auditAction
}) {
    if (!guild || !executor) return false;

    try {
        const settings = await loadSettings(guild.id);

        if (!settings.enabled) return false;
        if (!settings.protections[action]) return false;

        if (executor.bot && executor.id === guild.client.user.id) {
            return false;
        }

        if (await isWhitelisted(guild, executor.id)) {
            return false;
        }

        const threshold = settings.thresholds[action];

        if (
            !threshold ||
            !Number.isInteger(threshold.limit) ||
            threshold.limit < 1
        ) {
            return false;
        }

        const now = Date.now();

        const key = `${guild.id}:${executor.id}:${action}`;
        const cooldownKey = `${guild.id}:${executor.id}`;

        const lastPunishment =
            punishmentCooldowns.get(cooldownKey) || 0;

        if (now - lastPunishment < PUNISHMENT_COOLDOWN) {
            return false;
        }

        const history = (actionHistory.get(key) || [])
            .filter(timestamp =>
                now - timestamp < threshold.interval
            );

        history.push(now);
        actionHistory.set(key, history);

        if (history.length < threshold.limit) {
            return false;
        }

        actionHistory.set(key, []);
        punishmentCooldowns.set(cooldownKey, now);

        const actionNames = {
            channelDelete: 'Channel Deletion',
            channelCreate: 'Channel Creation',
            roleDelete: 'Role Deletion',
            roleCreate: 'Role Creation',
            ban: 'Member Ban',
            kick: 'Member Kick',
            webhook: 'Webhook Activity',
            botAdd: 'Bot Addition'
        };

        const punishment = await punishExecutor(
            guild,
            executor,
            settings
        ).catch(error => {
            console.error(
                '[ALTARE ANTINUKE] Punishment error:',
                error
            );

            return 'Punishment failed';
        });

        await sendAntiNukeLog(
            guild,
            executor,
            actionNames[action] || action,
            history.length,
            punishment
        );

        return true;

    } catch (error) {
        console.error(
            '[ALTARE ANTINUKE] Detection error:',
            error
        );

        return false;
    }
}

export { DEFAULT_SETTINGS };
