
import { EmbedBuilder } from 'discord.js';

import {
    configureAntiNuke,
    getAntiNukeSettings
} from '../../services/antinukeService.js';

import {
    getCommandRoles
} from '../../services/commandPermissions.js';

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

// Cayo-style Anti-Nuke help embed.
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
            '```'
        )
        .setFooter({
            text: 'Jurukai Help'
        });
}

// Simple standalone response embed.
function createResponse(color, description) {
    return new EmbedBuilder()
        .setColor(color)
        .setDescription(description);
}

function getRoleMention(guild, roleIds) {
    if (!roleIds.length) {
        return '**Anti-Nuke staff**';
    }

    return roleIds.map(roleId => {
        const role = guild.roles.cache.get(roleId);

        return role
            ? '<@&' + roleId + '>'
            : '**Anti-Nuke staff**';
    }).join(' or ');
}

export default {
    name: 'antinuke',
    aliases: ['an'],
    cooldown: 3,

    // Anti-Nuke performs its own permission check.
    handlesPermissions: true,

    async execute(client, message, args) {
        const guild = message.guild;

        if (!guild) return;

        let roleIds = [];

        try {
            roleIds = await getCommandRoles(
                guild.id,
                'antinuke'
            );
        } catch (error) {
            console.error(
                '[JURUKAI ANTINUKE] Permission lookup failed:',
                error
            );

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning +
                        ' Anti-Nuke permissions could not be checked right now.'
                    )
                ]
            });
        }

        const isOwner = guild.ownerId === message.author.id;

        const hasStaffRole = roleIds.some(roleId =>
            message.member?.roles.cache.has(roleId)
        );

        if (!isOwner && !hasStaffRole) {
            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.warning,
                        EMOJIS.warning +
                        ' you must have ' +
                        getRoleMention(guild, roleIds) +
                        ' perms.'
                    )
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();

        // ,antinuke
        if (!subcommand) {
            return message.channel.send({
                embeds: [buildHelp(client)]
            });
        }

        // ,antinuke enable
        // ,antinuke disable
        if (
            subcommand === 'enable' ||
            subcommand === 'disable'
        ) {
            const enabled = subcommand === 'enable';

            const settings = await getAntiNukeSettings(guild.id);

            // Protection is already in the requested state.
            if (settings.enabled === enabled) {
                return message.channel.send({
                    embeds: [
                        createResponse(
                            COLORS.deny,
                            EMOJIS.deny +
                            ' antinuke protection is already ' +
                            (enabled ? 'enabled.' : 'disabled.')
                        )
                    ]
                });
            }

            await configureAntiNuke(guild.id, {
                enabled: enabled
            });

            return message.channel.send({
                embeds: [
                    createResponse(
                        COLORS.approve,
                        EMOJIS.approve +
                        ' antinuke protection is now **' +
                        (enabled ? 'Enabled' : 'Disabled') +
                        '**.'
                    )
                ]
            });
        }

        // Invalid subcommand.
        return message.channel.send({
            embeds: [
                createResponse(
                    COLORS.warning,
                    EMOJIS.warning +
                    ' use `,antinuke`, `,antinuke enable`, or `,antinuke disable`.'
                )
            ]
        });
    }
};
