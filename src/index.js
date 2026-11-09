
import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    Events
} from 'discord.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[JURUMI] Missing DISCORD_TOKEN environment variable.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once(Events.ClientReady, (readyClient) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('♡ JURUMI IS ONLINE ♡');
    console.log(`Logged in as: ${readyClient.user.tag}`);
    console.log(`Bot ID: ${readyClient.user.id}`);
    console.log(`Servers: ${readyClient.guilds.cache.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

client.on(Events.Error, (error) => {
    console.error('[JURUMI] Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('[JURUMI] Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('[JURUMI] Uncaught exception:', error);
    process.exit(1);
});

client.login(token).catch((error) => {
    console.error('[JURUMI] Failed to log in:', error);
    process.exit(1);
});
