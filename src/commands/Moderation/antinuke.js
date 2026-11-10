
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

import {
    configureAntiNuke,
    getAntiNukeSettings,
    addAntiNukeWhitelist,
    removeAntiNukeWhitelist
} from '../../services/antinukeService.js';

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

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle(`Altare | ${title}`)
        .setDescription(description)
        .setFooter({ text: 'Altare Security System' })
        .setTimestamp();
}

function getTargetId(input) {
    return input?.match(/\d{17,20}/)?.[0] || null;
}

export default {
    name: 'antinuke',
    aliases: ['an'],
    cooldown: 3,

    async execute(client, message, args) {
        const guild = message.guild;

        const isOwner = guild.ownerId === message.author.id;
        const isAdmin = message.member.permissions.has(
            PermissionFlagsBits.Administrator
        );
        const canManage = message.member.permissions.has(
            PermissionFlagsBits.ManageGuild
        );

        if (!isOwner && !isAdmin && !canManage) {
            return message.reply({
                content: 'You need **Manage Server** or **Administrator** to configure Anti-Nuke.',
                allowedMentions: { repliedUser: false }
            });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'help') {
            const embed = createEmbed(
                'Anti-Nuke Commands',
                [
                    '` ,antinuke enable` — Enable all protections',
                    '`,antinuke disable` — Disable Anti-Nuke',
                    '`,antinuke status` — View current settings',
                    '`,antinuke whitelist add @user` — Trust a user',
                    '`,antinuke whitelist remove @user` — Remove a trusted user',
                    '`,antinuke punishment strip|ban|kick|timeout` — Set punishment',
                    '`,antinuke logchannel #channel` — Set the log channel',
                    '`,antinuke protection <action> on|off` — Toggle a protection',
                    '`,antinuke threshold <action> <amount> <seconds>` — Set a threshold'
                ].join('\n').replace('` ,', '`,')
            );

            return message.reply({ embeds: [embed] });
        }

        if (subcommand === 'enable' || subcommand === 'disable') {
            const enabled = subcommand === 'enable';

            await configureAntiNuke(guild.id, { enabled });

            return message.reply({
                embeds: [
                    createEmbed(
                        'Anti-Nuke Updated',
                        `Anti-Nuke is now **${enabled ? 'enabled' : 'disabled'}**.`
                    )
                ]
            });
        }

        if (subcommand === 'status') {
            const settings = await getAntiNukeSettings(guild.id);

            const protectionList = Object.entries(settings.protections)
                .map(([key, enabled]) =>
                    `${enabled ? '🟢' : '🔴'} **${ACTIONS[key] || key}:** ${enabled ? 'Enabled' : 'Disabled'}`
                )
                .join('\n');

            const embed = createEmbed(
                'Security Status',
                [
                    `**System:** ${settings.enabled ? 'Enabled' : 'Disabled'}`,
                    `**Punishment:** ${settings.punishment}`,
                    `**Log Channel:** ${settings.logChannel ? `<#${settings.logChannel}>` : 'Not configured'}`,
                    '',
                    '**Protections**',
                    protectionList
                ].join('\n')
            );

            return message.reply({ embeds: [embed] });
        }

        if (subcommand === 'whitelist') {
            const operation = args[1]?.toLowerCase();
            const targetId =
                getTargetId(args[2]) || getTargetId(message.mentions.users.first()?.id);

            if (!['add', 'remove'].includes(operation) || !targetId) {
                return message.reply(
                    'Usage: `,antinuke whitelist add @user` or `,antinuke whitelist remove @user`'
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
                        createEmbed(
                            'Whitelist Updated',
                            `<@${targetId}> has been added to the Anti-Nuke whitelist.`
                        )
                    ]
                });
            }

            await removeAntiNukeWhitelist(guild.id, targetId);

            return message.reply({
                embeds: [
                    createEmbed(
                        'Whitelist Updated',
                        `<@${targetId}> has been removed from the Anti-Nuke whitelist.`
                    )
                ]
            });
        }

        if (subcommand === 'punishment') {
            const punishment = args[1]?.toLowerCase();

            if (!PUNISHMENTS.includes(punishment)) {
                return message.reply(
                    'Choose a punishment: `strip`, `ban`, `kick`, or `timeout`.'
                );
            }

            await configureAntiNuke(guild.id, { punishment });

            return message.reply({
                embeds: [
                    createEmbed(
                        'Punishment Updated',
                        `The Anti-Nuke punishment is now **${punishment}**.`
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
                return message.reply('That is not a usable text channel in this server.');
            }

            await configureAntiNuke(guild.id, {
                logChannel: channel.id
            });

            return message.reply({
                embeds: [
                    createEmbed(
                        'Log Channel Updated',
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
                    `Usage: \`,antinuke protection <action> on|off\`\nAvailable actions: ${Object.keys(ACTIONS).join(', ')}`
                );
            }

            await configureAntiNuke(guild.id, {
                protections: {
                    [action]: state === 'on'
                }
            });

            return message.reply({
                embeds: [
                    createEmbed(
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
                    'Usage: `,antinuke threshold channelDelete 2 10`\nThe amount must be 1–100 and seconds must be 1–3600.'
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
                    createEmbed(
                        'Threshold Updated',
                        `**${ACTIONS[action]}** will trigger at **${limit} actions within ${seconds} seconds**.`
                    )
                ]
            });
        }

        return message.reply(
            'Unknown Anti-Nuke option. Use `,antinuke help` to see the commands.'
        );
    }
};
