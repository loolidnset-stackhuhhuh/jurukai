
import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    Events
} from 'discord.js';

import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[JURUMI] DISCORD_TOKEN is missing.');
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

client.once(Events.ClientReady, readyClient => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('JURUMI IS ONLINE');
    console.log(`Account: ${readyClient.user.tag}`);
    console.log(`Servers: ${readyClient.guilds.cache.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

client.on(Events.Error, error => {
    console.error('[JURUMI] Discord error:', error);
});

process.on('unhandledRejection', error => {
    console.error('[JURUMI] Unhandled rejection:', error);
});

async function startBot() {
    try {
        console.log('[JURUMI] Starting...');

        await loadCommands(client);
        await loadEvents(client);

        await client.login(token);
    } catch (error) {
        console.error('[JURUMI] Startup failed:', error);
        process.exit(1);
    }
}

startBot();
