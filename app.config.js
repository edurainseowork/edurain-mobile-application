// google-services.json Git me nahi hai (.gitignore). EAS build pe yeh file
// GOOGLE_SERVICES_JSON naam ke "file" environment variable se aati hai;
// local pe purani ./google-services.json hi use hoti hai.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile,
  },
});
