
export const botConfig = {
    name: 'Jurumi',
    displayName: 'JURUMI',
    version: '1.0.0',

    colors: {
        primary: 0xF4B6D2,
        secondary: 0xFFFFFF,
        success: 0xA8D5BA,
        error: 0xEFA3B8,
        warning: 0xF7D9A9
    },

    commands: {
        prefix: ',',
        allowPrefix: true,
        allowSlash: true,
        defaultCooldown: 3
    },

    embeds: {
        footer: 'Jurumi ♡',
        timestamp: true
    },

    presence: {
        status: 'online',
        activity: 'your server ♡',
        type: 'Watching'
    },

    features: {
        moderation: true,
        protection: true,
        automod: true,
        logging: true,
        welcome: true,
        leveling: true,
        economy: true,
        tickets: true,
        giveaways: true,
        reactionRoles: true,
        suggestions: true,
        starboard: true
    }
};

export default botConfig;

