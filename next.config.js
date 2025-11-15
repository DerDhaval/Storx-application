/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    STORX_CLIENT_ID: process.env.STORX_CLIENT_ID,
    STORX_CLIENT_SECRET: process.env.STORX_CLIENT_SECRET,
    STORX_REDIRECT_URI: process.env.STORX_REDIRECT_URI,
    STORX_OAUTH_URL: process.env.STORX_OAUTH_URL || 'https://developer.storx.io/oauth',
    STORX_API_URL: process.env.STORX_API_URL || 'https://api.storx.io/v1',
  },
}

module.exports = nextConfig

