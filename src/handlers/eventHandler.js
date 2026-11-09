
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVENTS_PATH = path.resolve(__dirname, '../events');

export async function loadEvents(client) {
    let loaded = 0;
    let failed = 0;

    async function loadDirectory(directory) {
        let entries;

        try {
            entries = await readdir(directory, { withFileTypes: true });
        } catch (error) {
            console.error('[JURUMI] Failed to read event directory:', error);
            return;
        }

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
                const moduleUrl = pathToFileURL(fullPath).href;
                const eventModule = await import(moduleUrl);

                const event = eventModule.default ?? eventModule;

                if (!event.name || typeof event.execute !== 'function') {
                    throw new Error(
                        'Event must export a name and execute function.'
                    );
                }

                const handler = (...args) => {
                    Promise.resolve(event.execute(...args, client))
                        .catch((error) => {
                            console.error(
                                `[JURUMI] Event error (${event.name}):`,
                                error
                            );
                        });
                };

                if (event.once) {
                    client.once(event.name, handler);
                } else {
                    client.on(event.name, handler);
                }

                loaded++;

                console.log(`[JURUMI] Loaded event: ${event.name}`);
            } catch (error) {
                failed++;

                console.error(
                    `[JURUMI] Failed to load event ${entry.name}:`,
                    error
                );
            }
        }
    }

    await loadDirectory(EVENTS_PATH);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[JURUMI] Events loaded: ${loaded}`);
    console.log(`[JURUMI] Events failed: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return loaded;
}
