
import {
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

import {
    configureAntiNuke
} from '../../services/antinukeService.js';

const COLOR = 0x3a4f53;

function buildHelp(client) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Jurukai Help',
            iconURL: client.user.displayAvatarURL()
        })
        .setTitle('Command: antinuke')
        .setDescription([
            'Enable or disable Anti-Nuke protection for your server.',
            '',
            '```',
            'Syntax: ,antinuke',
            'Example: ,antinuke enable',
            '```'
        ].join('\n'))
        .setFooter({
            text: 'Jurukai Help'
        });
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

        // HELP PAGE
        if (!subcommand || subcommand === 'help' || subcommand === 'status') {
            return message.reply({
                embeds: [buildHelp(client)],
                allowedMentions: { repliedUser: false }
            });
        }

        // ENABLE / DISABLE
        if (subcommand === 'enable' || subcommand === 'disable') {
            const enabled = subcommand === 'enable';

            await configureAntiNuke(guild.id, { enabled });

            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(
                            `Anti-Nuke protection is now **${enabled ? 'enabled' : 'disabled'}**.`
                        )
                        .setFooter({
                            text: 'Jurukai Help'
                        })
                ]
            });
        }

        message.channel.send({
            content: 'Use `,antinuke enable` or `,antinuke disable`.',
            allowedMentions: { repliedUser: false }
        });
    }
};
