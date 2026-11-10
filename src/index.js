
import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    Events
} from 'discord.js';

import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';

import { initializeDatabase } from './database/connection.js';
import { initializeAntiNukeDatabase } from './database/antinuke.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[ALTARE] DISCORD_TOKEN is missing.');
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
    console.log('ALTARE IS ONLINE');
    console.log(`Account: ${readyClient.user.tag}`);
    console.log(`Servers: ${readyClient.guilds.cache.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

client.on(Events.Error, error => {
    console.error('[ALTARE] Discord error:', error);
});

process.on('unhandledRejection', error => {
    console.error('[ALTARE] Unhandled rejection:', error);
});

async function startBot() {
    try {
        console.log('[ALTARE] Starting...');

        await initializeDatabase();
        await initializeAntiNukeDatabase();

        await loadCommands(client);
        await loadEvents(client);

        await client.login(token);
    } catch (error) {
        console.error('[ALTARE] Startup failed:', error);
        process.exit(1);
    }
}

startBot();
