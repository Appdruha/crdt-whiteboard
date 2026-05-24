import { useEffect, useState } from "react";
import { DEFAULT_CONFIG } from "../app/constants";
import type { DemoConfig } from "../app/types";

export function useDemoConfig() {
  const [config, setConfig] = useState<DemoConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    void bootstrapConfig();
  }, []);

  async function bootstrapConfig() {
    try {
      const response = await fetch("http://localhost:3001/config");

      if (!response.ok) {
        throw new Error("Config request failed");
      }

      const nextConfig = (await response.json()) as DemoConfig;
      setConfig(nextConfig);
    } catch {}
  }

  return config;
}
