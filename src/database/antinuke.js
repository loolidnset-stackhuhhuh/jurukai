
import { getDatabase } from './connection.js';

export async function initializeAntiNukeDatabase() {
    const db = getDatabase();

    await db.query(`
        CREATE TABLE IF NOT EXISTS antinuke_settings (
            guild_id VARCHAR(20) PRIMARY KEY,
            enabled BOOLEAN NOT NULL DEFAULT FALSE,
            punishment VARCHAR(20) NOT NULL DEFAULT 'strip',
            log_channel VARCHAR(20),
            protections JSONB NOT NULL DEFAULT '{}'::jsonb,
            thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS antinuke_whitelist (
            guild_id VARCHAR(20) NOT NULL,
            user_id VARCHAR(20) NOT NULL,
            added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guild_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS antinuke_admins (
            guild_id VARCHAR(20) NOT NULL,
            user_id VARCHAR(20) NOT NULL,
            added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guild_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS antinuke_blacklist (
            guild_id VARCHAR(20) NOT NULL,
            user_id VARCHAR(20) NOT NULL,
            added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guild_id, user_id)
        );
    `);

    console.log('[ALTARE] Anti-Nuke database initialized.');
}

export async function getAntiNukeData(guildId) {
    const db = getDatabase();

    const result = await db.query(
        'SELECT * FROM antinuke_settings WHERE guild_id = $1',
        [guildId]
    );

    return result.rows[0] || null;
}

export async function saveAntiNukeData(guildId, settings) {
    const db = getDatabase();

    await db.query(`
        INSERT INTO antinuke_settings (
            guild_id,
            enabled,
            punishment,
            log_channel,
            protections,
            thresholds,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (guild_id)
        DO UPDATE SET
            enabled = EXCLUDED.enabled,
            punishment = EXCLUDED.punishment,
            log_channel = EXCLUDED.log_channel,
            protections = EXCLUDED.protections,
            thresholds = EXCLUDED.thresholds,
            updated_at = CURRENT_TIMESTAMP
    `, [
        guildId,
        settings.enabled,
        settings.punishment,
        settings.logChannel,
        JSON.stringify(settings.protections),
        JSON.stringify(settings.thresholds)
    ]);
}

// WHITELIST

export async function getAntiNukeWhitelist(guildId) {
    const db = getDatabase();

    const result = await db.query(
        'SELECT user_id FROM antinuke_whitelist WHERE guild_id = $1',
        [guildId]
    );

    return result.rows.map(row => row.user_id);
}

export async function addAntiNukeWhitelist(guildId, userId) {
    const db = getDatabase();

    await db.query(`
        INSERT INTO antinuke_whitelist (guild_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (guild_id, user_id) DO NOTHING
    `, [guildId, userId]);

    return getAntiNukeWhitelist(guildId);
}

export async function removeAntiNukeWhitelist(guildId, userId) {
    const db = getDatabase();

    await db.query(
        'DELETE FROM antinuke_whitelist WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );

    return getAntiNukeWhitelist(guildId);
}

// ANTINUKE ADMINS

export async function getAntiNukeAdmins(guildId) {
    const db = getDatabase();

    const result = await db.query(
        'SELECT user_id FROM antinuke_admins WHERE guild_id = $1',
        [guildId]
    );

    return result.rows.map(row => row.user_id);
}

export async function addAntiNukeAdmin(guildId, userId) {
    const db = getDatabase();

    await db.query(`
        INSERT INTO antinuke_admins (guild_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (guild_id, user_id) DO NOTHING
    `, [guildId, userId]);

    return getAntiNukeAdmins(guildId);
}

export async function removeAntiNukeAdmin(guildId, userId) {
    const db = getDatabase();

    await db.query(
        'DELETE FROM antinuke_admins WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );

    return getAntiNukeAdmins(guildId);
}

// ANTINUKE BLACKLIST

export async function getAntiNukeBlacklist(guildId) {
    const db = getDatabase();

    const result = await db.query(
        'SELECT user_id FROM antinuke_blacklist WHERE guild_id = $1',
        [guildId]
    );

    return result.rows.map(row => row.user_id);
}

export async function addAntiNukeBlacklist(guildId, userId) {
    const db = getDatabase();

    await db.query(`
        INSERT INTO antinuke_blacklist (guild_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (guild_id, user_id) DO NOTHING
    `, [guildId, userId]);

    return getAntiNukeBlacklist(guildId);
}

export async function removeAntiNukeBlacklist(guildId, userId) {
    const db = getDatabase();

    await db.query(
        'DELETE FROM antinuke_blacklist WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );

    return getAntiNukeBlacklist(guildId);
}
