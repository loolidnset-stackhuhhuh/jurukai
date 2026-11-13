
import { EmbedBuilder } from 'discord.js';

import {
    configureAntiNuke,
    getAntiNukeSettings,
    addAntiNukeAdmin,
    removeAntiNukeAdmin,
    getAntiNukeAdminUsers,
    isAntiNukeAdmin,
    addAntiNukeWhitelist,
    removeAntiNukeWhitelist,
    getAntiNukeWhitelistUsers,
    isWhitelisted,
    addAntiNukeBlacklist,
    removeAntiNukeBlacklist,
    getAntiNukeBlacklistUsers,
    isAntiNukeBlacklisted,
    stripBlacklistedUser
} from '../../services/antinukeService.js';

import { getCommandRoles } from '../../services/commandPermissions.js';

const COLORS = {
    help: 0x0B0B0D,
    approve: 0x57F287,
    deny: 0xED4245,
    warning: 0xFEE75C
};

const EMOJIS = {
    approve: '<:approve:1562121487165558947>',
    deny: '<:deny:1562121610813513871>',
    warning: '<:warning:1562130172004540439>'
};

function createResponse(color, description) {
    return new EmbedBuilder()
        .setColor(color)
        .setDescription(description);
}

function buildHelp(client) {
    return new EmbedBuilder()
        .setColor(COLORS.help)
        .setAuthor({
            name: 'Jurukai Help',
            iconURL: client.user.displayAvatarURL()
        })
        .setTitle('Command: antinuke')
        .setDescription(
            'Browse every antinuke command and configuration surface.\n\n' +
            '```\n' +
            'Syntax: ,antinuke\n' +
            'Example: ,antinuke\n' +
            '```\n\n' +
            '**Protection**\n' +
            '`,antinuke enable`\n' +
            '`,antinuke disable`\n' +
            '`,antinuke protection list`\n' +
            '`,antinuke protection <name> on/off`\n\n' +
            '**Thresholds**\n' +
            '`,antinuke threshold list`\n' +
            '`,antinuke threshold <name> <amount> <seconds>`\n\n' +
            '**Logs**\n' +
            '`,antinuke log #channel`\n' +
            '`,antinuke log disable`\n\n' +
            '**Admins**\n' +
            '`,antinuke admin add @user`\n' +
            '`,antinuke admin remove @user`\n' +
            '`,antinuke admin list`\n\n' +
            '**Whitelist**\n' +
            '`,antinuke whitelist add @user`\n' +
            '`,antinuke whitelist remove @user`\n' +
            '`,antinuke whitelist list`\n\n' +
            '**Blacklist**\n' +
            '`,antinuke blacklist add @user`\n' +
            '`,antinuke blacklist remove @user`\n' +
            '`,antinuke blacklist list`'
        )
        .setFooter({ text: 'Jurukai Help' });
}

function getRoleMention(guild, roleIds) {
    if (!roleIds.length) return '**Anti-Nuke staff**';

    return roleIds.map(roleId =>
        guild.roles.cache.has(roleId)
            ? `<@&${roleId}>`
            : '**Anti-Nuke staff**'
    ).join(' or ');
}

function getUserId(input) {
    if (!input) return null;

    const match = input.match(/^<@!?(\d{17,20})>$/);
    if (match) return match[1];

    return /^\d{17,20}$/.test(input) ? input : null;
}

async function getTargetMember(guild, input) {
    const userId = getUserId(input);
    if (!userId) return null;

    return guild.members.fetch(userId).catch(() => null);
}

async function buildUserList(client, userIds) {
    if (!userIds.length) return 'No users found.';

    const lines = await Promise.all(
        userIds.slice(0, 25).map(async userId => {
            const user = await client.users.fetch(userId).catch(() => null);

            return user
                ? `• ${user.username} (<@${userId}>)`
                : `• <@${userId}>`;
        })
    );

    if (userIds.length > 25) {
        lines.push(`And ${userIds.length - 25} more...`);
    }

    return lines.join('\n');
}

export default {
    name: 'antinuke',
    aliases: ['an'],
    cooldown: 3,
    handlesPermissions: true,

    async execute(client, message, args) {
        const guild = message.guild;
        if (!guild) return;

        const userId = message.author.id;
        const isOwner = guild.ownerId === userId;

        let roleIds = [];

        try {
            roleIds = await getCommandRoles(guild.id, 'antinuke');
        } catch (error) {
            console.error('[JURUKAI ANTINUKE] Permission lookup failed:', error);

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning + ' Anti-Nuke permissions could not be checked right now.'
                    )
                ]
            });
        }

        let isAdmin = false;
        let isUserWhitelisted = false;
        let isBlacklisted = false;

        try {
            isAdmin = await isAntiNukeAdmin(guild.id, userId);
            isUserWhitelisted = await isWhitelisted(guild, userId);
            isBlacklisted = await isAntiNukeBlacklisted(guild.id, userId);
        } catch (error) {
            console.error('[JURUKAI ANTINUKE] User permission lookup failed:', error);

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning + ' Anti-Nuke user permissions could not be checked right now.'
                    )
                ]
            });
        }

        // BLACKLIST ENFORCEMENT
        if (isBlacklisted && !isOwner && !isAdmin && !isUserWhitelisted) {
            const member = message.member ||
                await guild.members.fetch(userId).catch(() => null);

            const result = await stripBlacklistedUser(member);

            const description = result.success
                ? `${EMOJIS.warning} You are blacklisted from Anti-Nuke. **${result.removed}** removable role(s) have been stripped.`
                : `${EMOJIS.warning} You are blacklisted from Anti-Nuke. Role removal could not be completed: ${result.reason}`;

            return message.channel.send({
                embeds: [createResponse(COLORS.warning, description)],
                allowedMentions: { parse: [] }
            });
        }

        const hasStaffRole = roleIds.some(roleId =>
            message.member?.roles.cache.has(roleId)
        );

        const hasAccess = isOwner || isAdmin || hasStaffRole;

        const subcommand = args[0]?.toLowerCase();
        const action = args[1]?.toLowerCase();

        if (!subcommand) {
            if (!hasAccess) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' you must have ' +
                            getRoleMention(guild, roleIds) + ' perms.'
                        )
                    ]
                });
            }

            return message.channel.send({
                embeds: [buildHelp(client)]
            });
        }

        // ADMIN MANAGEMENT
        if (subcommand === 'admin') {
            if (!isOwner && !isAdmin) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' only the server owner or an Anti-Nuke admin can manage Anti-Nuke admins.'
                        )
                    ]
                });
            }

            if (action === 'list') {
                const admins = await getAntiNukeAdminUsers(guild.id);

                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.help,
                            admins.length
                                ? '**Anti-Nuke Admins**\n\n' + await buildUserList(client, admins)
                                : EMOJIS.warning + ' There are no Anti-Nuke admins assigned.'
                        )
                    ]
                });
            }

            if (action === 'add' || action === 'remove') {
                const target = await getTargetMember(guild, args[2]);

                if (!target) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.warning, EMOJIS.warning + ' please mention a valid server member.')
                        ]
                    });
                }

                if (target.id === guild.ownerId || target.id === client.user.id) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.warning, EMOJIS.warning + ' this user cannot be assigned as an Anti-Nuke admin.')
                        ]
                    });
                }

                const currentAdmins = await getAntiNukeAdminUsers(guild.id);

                if (action === 'add') {
                    if (currentAdmins.includes(target.id)) {
                        return message.channel.send({
                            embeds: [
                                createResponse(COLORS.deny, EMOJIS.deny + ` <@${target.id}> is already an Anti-Nuke admin.`)
                            ]
                        });
                    }

                    await addAntiNukeAdmin(guild.id, target.id);
                    await removeAntiNukeBlacklist(guild.id, target.id);

                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.approve, EMOJIS.approve + ` <@${target.id}> is now an **Anti-Nuke admin**.`)
                        ]
                    });
                }

                if (!currentAdmins.includes(target.id)) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.deny, EMOJIS.deny + ` <@${target.id}> is not an Anti-Nuke admin.`)
                        ]
                    });
                }

                await removeAntiNukeAdmin(guild.id, target.id);

                return message.channel.send({
                    embeds: [
                        createResponse(COLORS.approve, EMOJIS.approve + ` <@${target.id}> is no longer an **Anti-Nuke admin**.`)
                    ]
                });
            }

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning + ' use `,antinuke admin add @user`, `,antinuke admin remove @user`, or `,antinuke admin list`.'
                    )
                ]
            });
        }

        // ALL OTHER COMMANDS REQUIRE NORMAL ACCESS
        if (!hasAccess) {
            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning + ' you must have ' +
                        getRoleMention(guild, roleIds) + ' perms.'
                    )
                ]
            });
        }

        // INDIVIDUAL PROTECTION CONTROLS
        if (subcommand === 'protection') {
            const settings = await getAntiNukeSettings(guild.id);

            if (action === 'list') {
                const lines = Object.entries(settings.protections).map(
                    ([name, enabled]) =>
                        `${enabled ? EMOJIS.approve : EMOJIS.deny} **${name}** — ${enabled ? 'Enabled' : 'Disabled'}`
                );

                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.help,
                            '**Anti-Nuke Protections**\n\n' + lines.join('\n')
                        )
                    ]
                });
            }

            const protection = Object.keys(settings.protections).find(
    name => name.toLowerCase() === args[1]?.toLowerCase()
);
            const state = args[2]?.toLowerCase();

            if (!Object.hasOwn(settings.protections, protection)) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' Invalid protection. Use `,antinuke protection list` to see available protections.'
                        )
                    ]
                });
            }

            if (state !== 'on' && state !== 'off') {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' use `on` or `off`. Example: `,antinuke protection channelDelete off`.'
                        )
                    ]
                });
            }

            const enabled = state === 'on';

            if (settings.protections[protection] === enabled) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.deny,
                            EMOJIS.deny + ` **${protection}** protection is already ${enabled ? 'enabled' : 'disabled'}.`
                        )
                    ]
                });
            }

            await configureAntiNuke(guild.id, {
                protections: {
                    [protection]: enabled
                }
            });

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.approve,
                        EMOJIS.approve + ` **${protection}** protection is now **${enabled ? 'Enabled' : 'Disabled'}**.`
                    )
                ]
            });
        }

        // THRESHOLD CONFIGURATION
        if (subcommand === 'threshold') {
            const settings = await getAntiNukeSettings(guild.id);

            if (action === 'list') {
                const lines = Object.entries(settings.thresholds).map(
                    ([name, threshold]) =>
                        `**${name}** — ${threshold.limit} action(s) / ${threshold.interval / 1000} second(s)`
                );

                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.help,
                            '**Anti-Nuke Thresholds**\n\n' + lines.join('\n')
                        )
                    ]
                });
            }

            const protection = Object.keys(settings.thresholds).find(
    name => name.toLowerCase() === args[1]?.toLowerCase()
);
            const limit = Number(args[2]);
            const seconds = Number(args[3]);

            if (!Object.hasOwn(settings.thresholds, protection)) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' Invalid protection. Use `,antinuke threshold list` to see available protections.'
                        )
                    ]
                });
            }

            if (
                !Number.isInteger(limit) ||
                limit < 1 ||
                limit > 100 ||
                !Number.isInteger(seconds) ||
                seconds < 1 ||
                seconds > 300
            ) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' enter an amount from **1–100** and a time from **1–300 seconds**. Example: `,antinuke threshold channelDelete 3 10`.'
                        )
                    ]
                });
            }

            const current = settings.thresholds[protection];

            if (
                current.limit === limit &&
                current.interval === seconds * 1000
            ) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.deny,
                            EMOJIS.deny + ` **${protection}** already uses ${limit} action(s) within ${seconds} second(s).`
                        )
                    ]
                });
            }

            await configureAntiNuke(guild.id, {
                thresholds: {
                    [protection]: {
                        limit,
                        interval: seconds * 1000
                    }
                }
            });

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.approve,
                        EMOJIS.approve + ` **${protection}** threshold is now **${limit} action(s) within ${seconds} second(s)**.`
                    )
                ]
            });
        }

        // LOG CHANNEL
        if (subcommand === 'log') {
            if (action === 'disable') {
                const settings = await getAntiNukeSettings(guild.id);

                if (!settings.logChannel) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.deny, EMOJIS.deny + ' Anti-Nuke logging is already disabled.')
                        ]
                    });
                }

                await configureAntiNuke(guild.id, { logChannel: null });

                return message.channel.send({
                    embeds: [
                        createResponse(COLORS.approve, EMOJIS.approve + ' Anti-Nuke logging has been **disabled**.')
                    ]
                });
            }

            const channelMatch = args[1]?.match(/^<#(\d{17,20})>$/);
            const channelId = channelMatch?.[1];

            if (!channelId) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.warning,
                            EMOJIS.warning + ' mention a text channel. Example: `,antinuke log #channel` or use `,antinuke log disable`.'
                        )
                    ]
                });
            }

            const channel = await guild.channels.fetch(channelId).catch(() => null);

            if (!channel || !channel.isTextBased() || !channel.send) {
                return message.channel.send({
                    embeds: [
                        createResponse(COLORS.warning, EMOJIS.warning + ' that is not a valid text channel in this server.')
                    ]
                });
            }

            await configureAntiNuke(guild.id, { logChannel: channel.id });

            return message.channel.send({
                embeds: [
                    createResponse(COLORS.approve, EMOJIS.approve + ` Anti-Nuke logs will now be sent to ${channel}.`)
                ]
            });
        }

        // WHITELIST MANAGEMENT
        if (subcommand === 'whitelist') {
            if (action === 'list') {
                const users = await getAntiNukeWhitelistUsers(guild.id);

                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.help,
                            users.length
                                ? '**Anti-Nuke Whitelist**\n\n' + await buildUserList(client, users)
                                : EMOJIS.warning + ' The Anti-Nuke whitelist is empty.'
                        )
                    ]
                });
            }

            if (action === 'add' || action === 'remove') {
                const target = await getTargetMember(guild, args[2]);

                if (!target) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.warning, EMOJIS.warning + ' please mention a valid server member.')
                        ]
                    });
                }

                if (target.id === client.user.id) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.warning, EMOJIS.warning + ' the bot cannot be added to the whitelist.')
                        ]
                    });
                }

                const users = await getAntiNukeWhitelistUsers(guild.id);

                if (action === 'add') {
                    if (users.includes(target.id)) {
                        return message.channel.send({
                            embeds: [
                                createResponse(COLORS.deny, EMOJIS.deny + ` <@${target.id}> is already whitelisted.`)
                            ]
                        });
                    }

                    await addAntiNukeWhitelist(guild.id, target.id);
                    await removeAntiNukeBlacklist(guild.id, target.id);

                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.approve, EMOJIS.approve + ` <@${target.id}> has been added to the **Anti-Nuke whitelist**.`)
                        ]
                    });
                }

                if (!users.includes(target.id)) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.deny, EMOJIS.deny + ` <@${target.id}> is not whitelisted.`)
                        ]
                    });
                }

                await removeAntiNukeWhitelist(guild.id, target.id);

                return message.channel.send({
                    embeds: [
                        createResponse(COLORS.approve, EMOJIS.approve + ` <@${target.id}> has been removed from the **Anti-Nuke whitelist**.`)
                    ]
                });
            }

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning + ' use `,antinuke whitelist add @user`, `,antinuke whitelist remove @user`, or `,antinuke whitelist list`.'
                    )
                ]
            });
        }

        // BLACKLIST MANAGEMENT
        if (subcommand === 'blacklist') {
            if (action === 'list') {
                const users = await getAntiNukeBlacklistUsers(guild.id);

                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.help,
                            users.length
                                ? '**Anti-Nuke Blacklist**\n\n' + await buildUserList(client, users)
                                : EMOJIS.warning + ' The Anti-Nuke blacklist is empty.'
                        )
                    ]
                });
            }

            if (action === 'add' || action === 'remove') {
                const target = await getTargetMember(guild, args[2]);

                if (!target) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.warning, EMOJIS.warning + ' please mention a valid server member.')
                        ]
                    });
                }

                if (target.id === guild.ownerId || target.id === client.user.id) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.warning, EMOJIS.warning + ' this user cannot be added to the Anti-Nuke blacklist.')
                        ]
                    });
                }

                const users = await getAntiNukeBlacklistUsers(guild.id);

                if (action === 'add') {
                    const admins = await getAntiNukeAdminUsers(guild.id);

                    if (admins.includes(target.id)) {
                        return message.channel.send({
                            embeds: [
                                createResponse(COLORS.warning, EMOJIS.warning + ' Anti-Nuke admins cannot be blacklisted.')
                            ]
                        });
                    }

                    if (users.includes(target.id)) {
                        return message.channel.send({
                            embeds: [
                                createResponse(COLORS.deny, EMOJIS.deny + ` <@${target.id}> is already blacklisted.`)
                            ]
                        });
                    }

                    await addAntiNukeBlacklist(guild.id, target.id);
                    await removeAntiNukeWhitelist(guild.id, target.id);

                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.approve, EMOJIS.approve + ` <@${target.id}> has been added to the **Anti-Nuke blacklist**.`)
                        ]
                    });
                }

                if (!users.includes(target.id)) {
                    return message.channel.send({
                        embeds: [
                            createResponse(COLORS.deny, EMOJIS.deny + ` <@${target.id}> is not blacklisted.`)
                        ]
                    });
                }

                await removeAntiNukeBlacklist(guild.id, target.id);

                return message.channel.send({
                    embeds: [
                        createResponse(COLORS.approve, EMOJIS.approve + ` <@${target.id}> has been removed from the **Anti-Nuke blacklist**.`)
                    ]
                });
            }

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning + ' use `,antinuke blacklist add @user`, `,antinuke blacklist remove @user`, or `,antinuke blacklist list`.'
                    )
                ]
            });
        }

        // ENABLE / DISABLE
        if (subcommand === 'enable' || subcommand === 'disable') {
            const enabled = subcommand === 'enable';
            const settings = await getAntiNukeSettings(guild.id);

            if (settings.enabled === enabled) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.deny,
                            EMOJIS.deny + ' antinuke protection is already ' +
                            (enabled ? 'enabled.' : 'disabled.')
                        )
                    ]
                });
            }

            await configureAntiNuke(guild.id, { enabled });

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.approve,
                        EMOJIS.approve + ' antinuke protection is now **' +
                        (enabled ? 'Enabled' : 'Disabled') + '**.'
                    )
                ]
            });
        }

        return message.channel.send({
            embeds: [
                createResponse(
                    COLORS.warning,
                    EMOJIS.warning + ' use `,antinuke`, `,antinuke enable`, `,antinuke disable`, `,antinuke protection`, `,antinuke threshold`, `,antinuke log`, `,antinuke admin`, `,antinuke whitelist`, or `,antinuke blacklist`.'
                )
            ]
        });
    }
};
