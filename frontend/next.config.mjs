/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.postimg.cc', // ARCHITECT NOTE: The '**' wildcard allows all secure domains. For strict enterprise security, replace this with your specific image host (e.g., 'res.cloudinary.com').
            },
        ],
    },
};

export default nextConfig;
