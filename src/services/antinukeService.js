
import {
  AuditLogEvent,
  PermissionFlagsBits,
} from 'discord.js';

const guildSettings = new Map();
const actionHistory = new Map();

const DEFAULT_SETTINGS = {
  enabled: false,
  punishment: 'strip',
  logChannel: null,
  whitelist: [],
  thresholds: {
    channelDelete: { limit: 2, interval: 10000 },
    channelCreate: { limit: 5, interval: 10000 },
    roleDelete: { limit: 2, interval: 10000 },
    roleCreate: { limit: 5, interval: 10000 },
    ban: { limit: 3, interval: 10000 },
    kick: { limit: 4, interval: 10000 },
    webhook: { limit: 2, interval: 10000 },
    botAdd: { limit: 1, interval: 10000 },
  },
  protections: {
    channelDelete: true,
    channelCreate: true,
    roleDelete: true,
    roleCreate: true,
    ban: true,
    kick: true,
    webhook: true,
    botAdd: true,
  },
};

function getSettings(guildId) {
  if (!guildSettings.has(guildId)) {
    guildSettings.set(
      guildId,
      structuredClone(DEFAULT_SETTINGS)
    );
  }

  return guildSettings.get(guildId);
}

export function configureAntiNuke(guildId, updates = {}) {
  const settings = getSettings(guildId);

  if (updates.punishment) {
    settings.punishment = updates.punishment;
  }

  if (updates.logChannel !== undefined) {
    settings.logChannel = updates.logChannel;
  }

  if (updates.enabled !== undefined) {
    settings.enabled = updates.enabled;
  }

  if (updates.protections) {
    Object.assign(settings.protections, updates.protections);
  }

  if (updates.thresholds) {
    Object.assign(settings.thresholds, updates.thresholds);
  }

  return settings;
}

export function getAntiNukeSettings(guildId) {
  return getSettings(guildId);
}

export function addAntiNukeWhitelist(guildId, userId) {
  const settings = getSettings(guildId);

  if (!settings.whitelist.includes(userId)) {
    settings.whitelist.push(userId);
  }

  return settings.whitelist;
}

export function removeAntiNukeWhitelist(guildId, userId) {
  const settings = getSettings(guildId);

  settings.whitelist = settings.whitelist.filter(
    id => id !== userId
  );

  return settings.whitelist;
}

export function isWhitelisted(guild, userId) {
  const settings = getSettings(guild.id);

  return (
    userId === guild.ownerId ||
    settings.whitelist.includes(userId)
  );
}

async function punishExecutor(guild, executor, settings) {
  const member = await guild.members.fetch(executor.id).catch(() => null);

  if (!member || !member.manageable) return 'Could not moderate executor';

  switch (settings.punishment) {
    case 'ban':
      await member.ban({
        reason: 'Anti-Nuke: Suspicious destructive activity.',
      });
      return 'Banned';

    case 'kick':
      await member.kick(
        'Anti-Nuke: Suspicious destructive activity.'
      );
      return 'Kicked';

    case 'strip': {
      const roles = member.roles.cache
        .filter(role =>
          role.id !== guild.id &&
          role.editable
        );

      if (!roles.size) return 'No removable roles';

      await member.roles.remove(
        roles,
        'Anti-Nuke: Suspicious destructive activity.'
      );

      return 'Dangerous roles removed';
    }

    case 'timeout':
      await member.timeout(
        60 * 60 * 1000,
        'Anti-Nuke: Suspicious destructive activity.'
      );
      return 'Timed out';

    default:
      return 'No punishment applied';
  }
}

async function sendAntiNukeLog(guild, executor, action, count, punishment) {
  const settings = getSettings(guild.id);

  if (!settings.logChannel) return;

  const channel = await guild.channels
    .fetch(settings.logChannel)
    .catch(() => null);

  if (!channel?.isTextBased() || !channel.send) return;

  await channel.send({
    embeds: [{
      color: 0xff69b4,
      title: 'Anti-Nuke Protection Triggered',
      fields: [
        {
          name: 'Executor',
          value: `${executor} (\`${executor.id}\`)`,
        },
        {
          name: 'Detected Action',
          value: action,
          inline: true,
        },
        {
          name: 'Actions Detected',
          value: String(count),
          inline: true,
        },
        {
          name: 'Punishment',
          value: punishment,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Altare Security System' },
    }],
  }).catch(() => null);
}

export async function checkAntiNuke({
  guild,
  executor,
  action,
  auditAction,
}) {
  if (!guild || !executor) return false;

  const settings = getSettings(guild.id);

  if (!settings.enabled) return false;
  if (!settings.protections[action]) return false;

  if (isWhitelisted(guild, executor.id)) return false;

  const threshold = settings.thresholds[action];

  if (!threshold) return false;

  const now = Date.now();
  const key = `${guild.id}:${executor.id}:${action}`;

  if (!actionHistory.has(key)) {
    actionHistory.set(key, []);
  }

  const history = actionHistory.get(key).filter(
    timestamp => now - timestamp < threshold.interval
  );

  history.push(now);
  actionHistory.set(key, history);

  if (history.length < threshold.limit) return false;

  // Prevent repeated punishment for the same burst.
  actionHistory.set(key, []);

  const punishment = await punishExecutor(
    guild,
    executor,
    settings
  ).catch(() => 'Punishment failed');

  await sendAntiNukeLog(
    guild,
    executor,
    action,
    history.length,
    punishment
  );

  return true;
}

export { DEFAULT_SETTINGS };
