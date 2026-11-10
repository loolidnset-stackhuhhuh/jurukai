
import fs from 'node:fs';
import path from 'node:path';
import { Collection } from 'discord.js';
import {
    fileURLToPath,
    pathToFileURL
} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getCommand(client, name) {
    return client.commands?.get(name.toLowerCase()) || null;
}

export async function loadCommands(client) {
    const commandsPath = path.resolve(__dirname, '../commands');

    if (!client.commands) {
        client.commands = new Collection();
    } else {
        client.commands.clear();
    }

    if (!fs.existsSync(commandsPath)) {
        console.log('[ALTARE] No commands folder found.');
        return;
    }

    async function loadDirectory(directory) {
        const entries = fs.readdirSync(directory, {
            withFileTypes: true
        });

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                await loadDirectory(fullPath);
                continue;
            }

            if (!entry.isFile() || !entry.name.endsWith('.js')) {
                continue;
            }

            try {
                const fileUrl = pathToFileURL(fullPath).href;
                const imported = await import(fileUrl);

                const command = imported.default ?? imported;

                if (
                    !command.name ||
                    typeof command.execute !== 'function'
                ) {
                    console.warn(
                        `[ALTARE] Skipping invalid command: ${entry.name}`
                    );
                    continue;
                }

                client.commands.set(
                    command.name.toLowerCase(),
                    command
                );

                if (Array.isArray(command.aliases)) {
                    for (const alias of command.aliases) {
                        client.commands.set(
                            alias.toLowerCase(),
                            command
                        );
                    }
                }

                console.log(
                    `[ALTARE] Loaded command: ${command.name}`
                );

            } catch (error) {
                console.error(
                    `[ALTARE] Failed to load ${entry.name}:`,
                    error
                );
            }
        }
    }

    await loadDirectory(commandsPath);

    console.log(
        `[ALTARE] Commands loaded: ${client.commands.size}`
    );
}
