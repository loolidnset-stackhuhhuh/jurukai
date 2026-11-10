
import { Events } from 'discord.js';
import { botConfig } from '../config/bot.js';
import { getCommand } from '../handlers/commandHandler.js';
import { checkCommandPermission } from '../services/commandPermissions.js';

const cooldowns = new Map();

export default {
    name: Events.MessageCreate,

    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        const prefix = botConfig.commands.prefix;

        if (!message.content.startsWith(prefix)) return;

        const args = message.content
            .slice(prefix.length)
            .trim()
            .split(/\s+/);

        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = getCommand(client, commandName);

        if (!command || command.enabled === false) return;

        const permission = await checkCommandPermission(
            message,
            command
        );

        if (!permission.allowed) {
            return message.reply({
                content: permission.reason,
                allowedMentions: { repliedUser: false }
            });
        }

        const cooldownTime =
            (command.cooldown ?? botConfig.commands.defaultCooldown) * 1000;

        const cooldownKey =
            `${message.guild.id}:${message.author.id}:${command.name}`;

        const now = Date.now();
        const expiration = cooldowns.get(cooldownKey);

        if (expiration && now < expiration) {
            const remaining = ((expiration - now) / 1000).toFixed(1);

            return message.reply({
                content: `Please wait ${remaining}s before using this command again.`,
                allowedMentions: { repliedUser: false }
            });
        }

        cooldowns.set(cooldownKey, now + cooldownTime);

        const timer = setTimeout(() => {
            cooldowns.delete(cooldownKey);
        }, cooldownTime);

        timer.unref?.();

        try {
            await command.execute(client, message, args);
        } catch (error) {
            console.error(
                `[ALTARE] Command error (${command.name}):`,
                error
            );

            await message.reply({
                content: 'An error occurred while executing this command.',
                allowedMentions: { repliedUser: false }
            }).catch(() => {});
        }
    }
};
