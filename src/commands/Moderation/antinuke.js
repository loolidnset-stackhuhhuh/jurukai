
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

import { getAntiNukeWhitelist } from '../../database/antinuke.js';

const COLOR = 0x3a4f53;

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
    ['overview', 'Overview'],
    ['protections', 'Protections'],
    ['punishment', 'Punishment'],
    ['whitelist', 'Whitelist'],
    ['thresholds', 'Thresholds'],
    ['logs', 'Logs']
];

function getTargetId(input) {
    return input?.match(/\d{17,20}/)?.[0] || null;
}

function getLogChannel(settings) {
    return settings.logChannel || settings.log_channel || null;
}

function makeNotice(client, title, description) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Jurukai Security',
            iconURL: client.user.displayAvatarURL()
        })
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Jurukai | Anti-Nuke' });
}

function makeNavigation(activePage, disabled = false) {
    const buttons = PAGES.map(([id, label]) =>
        new ButtonBuilder()
            .setCustomId(`antinuke:${id}`)
            .setLabel(label)
            .setStyle(
                id === activePage
                    ? ButtonStyle.Primary
                    : ButtonStyle.Secondary
            )
            .setDisabled(disabled || id === activePage)
    );

    return [
        new ActionRowBuilder().addComponents(buttons.slice(0, 3)),
        new ActionRowBuilder().addComponents(buttons.slice(3, 6))
    ];
}

async function buildDashboard(client, guild, page) {
    const settings = await getAntiNukeSettings(guild.id);
    const whitelist = await getAntiNukeWhitelist(guild.id);
    const logChannel = getLogChannel(settings);

    let title = 'Anti-Nuke Dashboard';
    let description = '';

    if (page === 'overview') {
        const enabled = Object.values(
            settings.protections || {}
        ).filter(Boolean).length;

        const channelName = logChannel
            ? guild.channels.cache.get(logChannel)?.name || logChannel
            : 'Not configured';

        description = [
            'Browse every antinuke command and configuration surface.',
            '',
            `**Syntax:** ,antinuke`,
            `**Status:** ,antinuke`,
        ].join('\n');
    }

    else if (page === 'protections') {
        title = 'Anti-Nuke | Protections';

        description = [
            'Review the protection modules currently active for this server.',
            '',
            ...Object.entries(ACTIONS).map(([key, label]) =>
                `**${label}:** ${settings.protections?.[key] ? 'ENABLED' : 'DISABLED'}`
            ),
            '',
            '**Configure:** `,antinuke protection <module> on|off`'
        ].join('\n');
    }

    else if (page === 'punishment') {
        title = 'Anti-Nuke | Punishment';

        description = [
            'Choose what Jurukai does when Anti-Nuke detects suspicious activity.',
            '',
            `**Current punishment:** ${String(settings.punishment || 'strip').toUpperCase()}`,
            '',
            `**${settings.punishment === 'strip' ? '●' : '○'} STRIP** — Remove manageable roles`,
            `**${settings.punishment === 'ban' ? '●' : '○'} BAN** — Ban the executor`,
            `**${settings.punishment === 'kick' ? '●' : '○'} KICK** — Kick the executor`,
            `**${settings.punishment === 'timeout' ? '●' : '○'} TIMEOUT** — Timeout for one hour`,
            '',
            '**Configure:** `,antinuke punishment <strip|ban|kick|timeout>`'
        ].join('\n');
    }

    else if (page === 'whitelist') {
        title = 'Anti-Nuke | Whitelist';

        const users = whitelist.length
            ? whitelist.slice(0, 20).map(id => `• <@${id}>`).join('\n')
            : 'No additional trusted users configured.';

        description = [
            'Trusted users are excluded from Anti-Nuke enforcement. The server owner is protected automatically.',
            '',
            `**Trusted Users (${whitelist.length})**`,
            users,
            '',
            '**Add:** `,antinuke whitelist add @user`',
            '**Remove:** `,antinuke whitelist remove @user`'
        ].join('\n');
    }

    else if (page === 'thresholds') {
        title = 'Anti-Nuke | Thresholds';

        description = [
            'Review how many actions are allowed before enforcement is triggered.',
            '',
            ...Object.entries(ACTIONS).map(([key, label]) => {
                const threshold = settings.thresholds?.[key];

                return threshold
                    ? `**${label}:** ${threshold.limit} actions / ${Math.round(threshold.interval / 1000)} seconds`
                    : `**${label}:** Not configured`;
            }),
            '',
            '**Configure:** `,antinuke threshold <module> <amount> <seconds>`'
        ].join('\n');
    }

    else if (page === 'logs') {
        title = 'Anti-Nuke | Logs';

        const channelName = logChannel
            ? guild.channels.cache.get(logChannel)?.name || logChannel
            : 'Not configured';

        description = [
            'Choose where Jurukai posts Anti-Nuke security reports.',
            '',
            `**Current log channel:** ${logChannel ? `#${channelName}` : 'Not configured'}`,
            '',
            '**Set channel:** `,antinuke logchannel #channel`'
        ].join('\n');
    }

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'JURUKAI SECURITY',
            iconURL: client.user.displayAvatarURL()
        })
        .setTitle(title)
        .setDescription(description.slice(0, 4000))
        .setFooter({
            text: `Jurukai | Anti-Nuke | ${guild.name}`
        })
        .setTimestamp();
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
            return message.reply({
                content: 'You need Manage Server or Administrator to configure Anti-Nuke.',
                allowedMentions: { repliedUser: false }
            });
        }

        const subcommand = args[0]?.toLowerCase();

        // DASHBOARD
        if (!subcommand || subcommand === 'help' || subcommand === 'status') {
            const sent = await message.reply({
                embeds: [
                    await buildDashboard(client, guild, 'overview')
                ],
                components: makeNavigation('overview'),
                allowedMentions: { repliedUser: false }
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
                            await buildDashboard(client, guild, page)
                        ],
                        components: makeNavigation(page)
                    });
                } catch (error) {
                    console.error(
                        '[JURUKAI ANTINUKE] Dashboard navigation error:',
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
                await sent.edit({
                    components: makeNavigation('overview', true)
                }).catch(() => {});
            });

            return sent;
        }

        // ENABLE / DISABLE
        if (subcommand === 'enable' || subcommand === 'disable') {
            const enabled = subcommand === 'enable';

            await configureAntiNuke(guild.id, { enabled });

            return message.reply({
                embeds: [
                    makeNotice(
                        client,
                        'System Updated',
                        `Anti-Nuke is now **${enabled ? 'enabled' : 'disabled'}**.`
                    )
                ]
            });
        }

        // WHITELIST
        if (subcommand === 'whitelist') {
            const operation = args[1]?.toLowerCase();

            const targetId =
                getTargetId(args[2]) ||
                message.mentions.users.first()?.id;

            if (!['add', 'remove'].includes(operation) || !targetId) {
                return message.reply(
                    'Use `,antinuke whitelist add @user` or `,antinuke whitelist remove @user`.'
                );
            }

            if (targetId === guild.ownerId) {
                return message.reply(
                    'The server owner is already protected.'
                );
            }

            if (targetId === client.user.id) {
                return message.reply(
                    'Jurukai does not need to be whitelisted.'
                );
            }

            if (operation === 'add') {
                await addAntiNukeWhitelist(guild.id, targetId);

                return message.reply({
                    embeds: [
                        makeNotice(
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
                    makeNotice(
                        client,
                        'Whitelist Updated',
                        `<@${targetId}> has been removed from the whitelist.`
                    )
                ]
            });
        }

        // PUNISHMENT
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
                    makeNotice(
                        client,
                        'Punishment Updated',
                        `Punishment is now **${punishment}**.`
                    )
                ]
            });
        }

        // LOG CHANNEL
        if (subcommand === 'logchannel') {
            const channelId =
                getTargetId(args[1]) ||
                message.mentions.channels.first()?.id;

            if (!channelId) {
                return message.reply(
                    'Mention a text channel. Example: `,antinuke logchannel #security-logs`'
                );
            }

            const channel = await guild.channels.fetch(channelId)
                .catch(() => null);

            if (!channel || !channel.isTextBased() || !channel.send) {
                return message.reply(
                    'That is not a usable text channel.'
                );
            }

            await configureAntiNuke(guild.id, {
                logChannel: channel.id
            });

            return message.reply({
                embeds: [
                    makeNotice(
                        client,
                        'Logs Updated',
                        `Anti-Nuke logs will be sent to ${channel}.`
                    )
                ]
            });
        }

        // PROTECTION MODULES
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
                    makeNotice(
                        client,
                        'Protection Updated',
                        `**${ACTIONS[action]}** is now **${state === 'on' ? 'enabled' : 'disabled'}**.`
                    )
                ]
            });
        }

        // THRESHOLDS
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
                    makeNotice(
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
