
export const permissionConfig = {
    ownerOnly: [
        'eval',
        'reload',
        'shutdown'
    ],

    staffRoleRequired: true,

    permissionGroups: {
        moderation: [
            'ban',
            'kick',
            'timeout',
            'untimeout',
            'warn',
            'warnings',
            'purge',
            'jail',
            'unjail',
            'softban',
            'lock',
            'unlock'
        ],

        protection: [
            'antinuke',
            'antiraid',
            'antispam'
        ],

        configuration: [
            'autorole',
            'welcome',
            'logging',
            'modlogs',
            'prefix',
            'permissions',
            'setup'
        ]
    }
};

export default permissionConfig;

