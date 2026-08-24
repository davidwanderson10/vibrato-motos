import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uploads (anexos/comprovantes) vão no corpo do Server Action. O padrão
      // do Next é só 1MB — fotos de celular estouram. Cada arquivo é limitado a
      // 10MB no código; este teto cobre alguns arquivos por envio.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
