const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
let siteHostname;

try {
  if (siteUrl) {
    siteHostname = new URL(siteUrl).hostname;
  }
} catch {
  siteHostname = undefined;
}

const remotePatterns = [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "**" },
  { protocol: "http", hostname: "**" },
  { protocol: "http", hostname: "localhost" },
  { protocol: "http", hostname: "127.0.0.1" }
];

if (siteHostname && !remotePatterns.some((item) => item.hostname === siteHostname)) {
  remotePatterns.push({ protocol: "https", hostname: siteHostname });
}

const nextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
    parallelServerCompiles: false,
    parallelServerBuildTraces: false
  },
  swcMinify: false,
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns
  }
};

module.exports = nextConfig;
