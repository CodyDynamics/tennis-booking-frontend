module.exports = {
  apps: [
    {
      name: 'tennis-booking-frontend',
      script: 'npm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',

      env: {
        PORT: 3001,
        NODE_ENV: 'production',
      },
    },
  ],
};
