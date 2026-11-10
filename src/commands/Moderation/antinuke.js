
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

import {
    configureAntiNuke,
    getAntiNukeSettings,
    addAntiNukeWhitelist,
    removeAntiNukeWhitelist
} from '../../services/antinukeService.js';

import {
    getAntiNukeWhitelist
} from '../../database/antinuke.js';

const COLOR = 0x2b2d31;

const ACTIONS = {
    channelDelete: 'Channel Deletion',
    channelCreate: 'Channel Creation',
    roleDelete: 'Role Deletion',
    roleCreate: 'Role Creation',
    ban: 'Member Ban',
    kick: 'Member Kick',
    webhook: 'Webhook Activity',
    botAdd: 'Bot Addition'
};

const PUNISHMENTS = ['strip', 'ban', 'kick', 'timeout'];

const PAGES = [
    ['overview', 'Overview', '⌂'],
    ['protections', 'Protections', '🛡️'],
    ['punishment', 'Punishment', '⚖️'],
    ['whitelist', 'Whitelist', '👥'],
    ['thresholds', 'Thresholds', '📊'],
    ['logs', 'Logs', '📜']
];

function makeEmbed(client, page, description, fields = []) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'ALTARE SECURITY',
            iconURL: client.user.displayAvatarURL()
        })
        .setTitle(`Anti-Nuke  /  ${page}`)
        .setDescription(description)
        .addFields(fields)
        .setFooter({
            text: 'ALTARE • Security Dashboard'
        })
        .setTimestamp();
}

function makeRows(activePage) {
    const buttons = PAGES.map(([id, label, emoji]) =>
        new ButtonBuilder()
            .setCustomId(`antinuke:${id}`)
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(
                id === activePage
                    ? ButtonStyle.Primary
                    : ButtonStyle.Secondary
            )
            .setDisabled(id === activePage)
    );

    return [
        new ActionRowBuilder().addComponents(buttons.slice(0, 3)),
        new ActionRowBuilder().addComponents(buttons.slice(3, 6))
    ];
}

function getTargetId(input) {
    return input?.match(/\d{17,20}/)?.[0] || null;
}

async function buildPage(client, guild, page) {
    const settings = await getAntiNukeSettings(guild.id);

    if (page === 'overview') {
        return makeEmbed(
            client,
            'Overview',
            'Monitor and manage your server protection from this dashboard.',
            [
                {
                    name: 'SYSTEM STATUS',
                    value: settings.enabled
                        ? '● **Enabled**'
                        : '● **Disabled**',
                    inline: true
                },
                {
                    name: 'PUNISHMENT',
                    value: `\`${settings.punishment.toUpperCase()}\``,
                    inline: true
                },
                {
                    name: 'LOG CHANNEL',
                    value: settings.logChannel
                        ? `<#${settings.logChannel}>`
                        : 'Not configured',
                    inline: true
                },
                {
                    name: 'PROTECTION MODULES',
                    value: `${Object.values(settings.protections).filter(Boolean).length} / ${Object.keys(ACTIONS).length} enabled`,
                    inline: true
                },
                {
                    name: 'TRUSTED USERS',
                    value: `${(await getAntiNukeWhitelist(guild.id)).length} users`,
                    inline: true
                },
                {
                    name: 'QUICK COMMANDS',
                    value: [
                        '`,antinuke enable`',
                        '`,antinuke disable`',
                        '`,antinuke status`'
                    ].join('\n')
                }
            ]
        );
    }

    if (page === 'protections') {
        const lines = Object.entries(ACTIONS).map(([key, label]) => {
            const enabled = settings.protections[key];

            return `${enabled ? '●' : '○'} **${label}**\n<${key}> · ${enabled ? 'Enabled' : 'Disabled'}`;
        });

        return makeEmbed(
            client,
            'Protections',
            'View the status of each Anti-Nuke protection module.',
            [
                {
                    name: 'MODULES',
                    value: lines.join('\n\n')
                },
                {
                    name: 'CONFIGURATION',
                    value: '`,antinuke protection <module> on`\n`,antinuke protection <module> off`'
                }
            ]
        );
    }

    if (page === 'punishment') {
        return makeEmbed(
            client,
            'Punishment',
            'Choose the punishment mode used when a user triggers Anti-Nuke.',
            [
                {
                    name: 'CURRENT MODE',
                    value: `**${settings.punishment.toUpperCase()}**`
                },
                {
                    name: 'AVAILABLE MODES',
                    value: [
                        ` ${settings.punishment === 'strip' ? '●' : '○'} **STRIP** — Remove manageable roles`,
                        ` ${settings.punishment === 'ban' ? '●' : '○'} **BAN** — Ban the executor`,
                        ` ${settings.punishment === 'kick' ? '●' : '○'} **KICK** — Kick the executor`,
                        ` ${settings.punishment === 'timeout' ? '●' : '○'} **TIMEOUT** — Timeout for one hour`
                    ].join('\n')
                },
                {
                    name: 'COMMAND',
                    value: PUNISHMENTS.map(
                        mode => `\`,antinuke punishment ${mode}\``
                    ).join('\n')
                }
            ]
        );
    }

    if (page === 'whitelist') {
        const users = await getAntiNukeWhitelist(guild.id);

        const display = users.length
            ? users.slice(0, 20).map(id => `• <@${id}>`).join('\n')
            : 'No additional trusted users configured.';

        return makeEmbed(
            client,
            'Whitelist',
            'Users on this list are excluded from Anti-Nuke enforcement. The server owner is protected automatically.',
            [
                {
                    name: `TRUSTED USERS (${users.length})`,
                    value: display
                },
                {
                    name: 'ADD USER',
                    value: '`,antinuke whitelist add @user`'
                },
                {
                    name: 'REMOVE USER',
                    value: '`,antinuke whitelist remove @user`'
                }
            ]
        );
    }

    if (page === 'thresholds') {
        const lines = Object.entries(ACTIONS).map(([key, label]) => {
            const threshold = settings.thresholds[key];

            if (!threshold) {
                return `○ **${label}** — Not configured`;
            }

            return `● **${label}** — ${threshold.limit} actions / ${Math.round(threshold.interval / 1000)} seconds`;
        });

        return makeEmbed(
            client,
            'Thresholds',
            'Review the action limits that trigger Anti-Nuke enforcement.',
            [
                {
                    name: 'CURRENT LIMITS',
                    value: lines.join('\n')
                },
                {
                    name: 'CONFIGURATION',
                    value: '`,antinuke threshold <module> <amount> <seconds>`\nExample: `,antinuke threshold channelDelete 2 10`'
                }
            ]
        );
    }

    if (page === 'logs') {
        return makeEmbed(
            client,
            'Logs',
            'View the configured destination for Anti-Nuke security reports.',
            [
                {
                    name: 'LOG DESTINATION',
                    value: settings.logChannel
                        ? `<#${settings.logChannel}>`
                        : 'No log channel configured.'
                },
                {
                    name: 'CONFIGURATION',
                    value: '`,antinuke logchannel #channel`'
                }
            ]
        );
    }

    return makeEmbed(client, 'Overview', 'Select a dashboard page.');
}

export default {
    name: 'antinuke',
    aliases: ['an'],
    cooldown: 3,

    async execute(client, message, args) {
        const guild = message.guild;

        if (!guild) return;

        const isOwner = guild.ownerId === message.author.id;
        const isAdmin = message.member.permissions.has(
            PermissionFlagsBits.Administrator
        );
        const canManage = message.member.permissions.has(
            PermissionFlagsBits.ManageGuild
        );

        if (!isOwner && !isAdmin && !canManage) {
            return message.reply(
                'You need Manage Server or Administrator to configure Anti-Nuke.'
            );
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'help') {
            const sent = await message.reply({
                embeds: [
                    await buildPage(client, guild, 'overview')
                ],
                components: makeRows('overview')
            });

            const collector = sent.createMessageComponentCollector({
                time: 300000,
                filter: interaction =>
                    interaction.customId.startsWith('antinuke:')
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({
                        content: 'Only the person who opened this dashboard can navigate it.',
                        ephemeral: true
                    });
                }

                const page = interaction.customId.split(':')[1];

                if (!PAGES.some(([id]) => id === page)) {
                    return interaction.deferUpdate();
                }

                try {
                    await interaction.update({
                        embeds: [
                            await buildPage(client, guild, page)
                        ],
                        components: makeRows(page)
                    });
                } catch (error) {
                    console.error(
                        '[ALTARE ANTINUKE] Dashboard error:',
                        error
                    );

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Unable to load that dashboard page.',
                            ephemeral: true
                        }).catch(() => {});
                    }
                }
            });

            collector.on('end', async () => {
                const disabledRows = makeRows('overview').map(row => {
                    return new ActionRowBuilder().addComponents(
                        row.components.map(button =>
                            ButtonBuilder.from(button).setDisabled(true)
                        )
                    );
                });

                await sent.edit({
                    components: disabledRows
                }).catch(() => {});
            });

            return sent;
        }

        if (subcommand === 'enable' || subcommand === 'disable') {
            const enabled = subcommand === 'enable';

            await configureAntiNuke(guild.id, { enabled });

            return message.reply({
                embeds: [
                    makeEmbed(
                        client,
                        'System Updated',
                        `Anti-Nuke is now **${enabled ? 'enabled' : 'disabled'}**.`
                    )
                ]
            });
        }

        if (subcommand === 'status') {
            const sent = await message.reply({
                embeds: [
                    await buildPage(client, guild, 'overview')
                ],
                components: makeRows('overview')
            });

            return sent;
        }

        if (subcommand === 'whitelist') {
            const operation = args[1]?.toLowerCase();
            const targetId =
                getTargetId(args[2]) ||
                getTargetId(message.mentions.users.first()?.id);

            if (!['add', 'remove'].includes(operation) || !targetId) {
                return message.reply(
                    'Use `,antinuke whitelist add @user` or `,antinuke whitelist remove @user`.'
                );
            }

            if (targetId === guild.ownerId) {
                return message.reply('The server owner is already protected.');
            }

            if (targetId === client.user.id) {
                return message.reply('Altare does not need to be whitelisted.');
            }

            if (operation === 'add') {
                await addAntiNukeWhitelist(guild.id, targetId);

                return message.reply({
                    embeds: [
                        makeEmbed(
                            client,
                            'Whitelist Updated',
                            `<@${targetId}> has been added to the whitelist.`
                        )
                    ]
                });
            }

            await removeAntiNukeWhitelist(guild.id, targetId);

            return message.reply({
                embeds: [
                    makeEmbed(
                        client,
                        'Whitelist Updated',
                        `<@${targetId}> has been removed from the whitelist.`
                    )
                ]
            });
        }

        if (subcommand === 'punishment') {
            const punishment = args[1]?.toLowerCase();

            if (!PUNISHMENTS.includes(punishment)) {
                return message.reply(
                    'Choose: `strip`, `ban`, `kick`, or `timeout`.'
                );
            }

            await configureAntiNuke(guild.id, { punishment });

            return message.reply({
                embeds: [
                    makeEmbed(
                        client,
                        'Punishment Updated',
                        `Punishment is now **${punishment}**.`
                    )
                ]
            });
        }

        if (subcommand === 'logchannel') {
            const channelId =
                getTargetId(args[1]) ||
                message.mentions.channels.first()?.id;

            if (!channelId) {
                return message.reply(
                    'Mention a text channel. Example: `,antinuke logchannel #security-logs`'
                );
            }

            const channel = await guild.channels.fetch(channelId).catch(() => null);

            if (!channel || !channel.isTextBased() || !channel.send) {
                return message.reply('That is not a usable text channel.');
            }

            await configureAntiNuke(guild.id, {
                logChannel: channel.id
            });

            return message.reply({
                embeds: [
                    makeEmbed(
                        client,
                        'Logs Updated',
                        `Anti-Nuke logs will be sent to ${channel}.`
                    )
                ]
            });
        }

        if (subcommand === 'protection') {
            const action = args[1];
            const state = args[2]?.toLowerCase();

            if (!ACTIONS[action] || !['on', 'off'].includes(state)) {
                return message.reply(
                    `Usage: ,antinuke protection <module> on|off\nModules: ${Object.keys(ACTIONS).join(', ')}`
                );
            }

            await configureAntiNuke(guild.id, {
                protections: {
                    [action]: state === 'on'
                }
            });

            return message.reply({
                embeds: [
                    makeEmbed(
                        client,
                        'Protection Updated',
                        `**${ACTIONS[action]}** is now **${state === 'on' ? 'enabled' : 'disabled'}**.`
                    )
                ]
            });
        }

        if (subcommand === 'threshold') {
            const action = args[1];
            const limit = Number(args[2]);
            const seconds = Number(args[3]);

            if (
                !ACTIONS[action] ||
                !Number.isInteger(limit) ||
                limit < 1 ||
                limit > 100 ||
                !Number.isInteger(seconds) ||
                seconds < 1 ||
                seconds > 3600
            ) {
                return message.reply(
                    'Usage: ,antinuke threshold <module> <amount> <seconds>'
                );
            }

            await configureAntiNuke(guild.id, {
                thresholds: {
                    [action]: {
                        limit,
                        interval: seconds * 1000
                    }
                }
            });

            return message.reply({
                embeds: [
                    makeEmbed(
                        client,
                        'Threshold Updated',
                        `**${ACTIONS[action]}** now triggers at **${limit} actions within ${seconds} seconds**.`
                    )
                ]
            });
        }

        return message.reply(
            'Unknown Anti-Nuke option. Type `,antinuke` to open the dashboard.'
        );
    }
};
