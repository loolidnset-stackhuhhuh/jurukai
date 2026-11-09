
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(client) {
    const commandsPath = path.resolve(__dirname, '../commands');

    if (!fs.existsSync(commandsPath)) {
        console.log('[JURUKAI] No commands folder found yet. Skipping command loading.');
        return;
    }

    async function loadDirectory(directory) {
        const entries = fs.readdirSync(directory, { withFileTypes: true });

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
                const command = await import(fileUrl);

                if (!command.name || typeof command.execute !== 'function') {
                    console.warn(`[JURUKAI] Skipping invalid command: ${entry.name}`);
                    continue;
                }

                client.commands.set(command.name.toLowerCase(), command);

                if (Array.isArray(command.aliases)) {
                    for (const alias of command.aliases) {
                        client.commands.set(alias.toLowerCase(), command);
                    }
                }

                console.log(`[JURUKAI] Loaded command: ${command.name}`);
            } catch (error) {
                console.error(`[JURUKAI] Failed to load ${entry.name}:`, error);
            }
        }
    }

    await loadDirectory(commandsPath);

    console.log(`[JURUKAI] Commands loaded: ${client.commands.size}`);
}
