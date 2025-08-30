import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    // CesiumJS configuration
    if (!isServer) {
      // Handle Cesium's large assets
      config.module.rules.push({
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      });
      
      config.module.rules.push({
        test: /\.(png|jpg|gif|svg|ico)$/,
        type: 'asset/resource',
      });

      // Handle Cesium workers and assets
      config.output.assetModuleFilename = 'static/[hash][ext]';
      
      // Define Cesium base URL for assets
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          CESIUM_BASE_URL: JSON.stringify('/cesium/')
        })
      );
    }
    
    return config;
  }
};

export default nextConfig;
