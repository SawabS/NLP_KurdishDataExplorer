import type { Config } from "tailwindcss";
import noorPreset from "../raw/sources/noor-ui/tailwind.config";

export default {
  presets: [noorPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../raw/sources/noor-ui/src/**/*.{ts,tsx}"],
} satisfies Config;
