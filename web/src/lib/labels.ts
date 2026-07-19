/** Single home for display-name shortening (was duplicated in ExplorePage and UploadPage). */

export function compactModelLabel(key: string, label: string) {
  if (key === "openai") return "OpenAI · text-embedding-3-small";
  if (key === "nvidia") return "NVIDIA · Nemotron Embed 1B";
  if (key === "kdx-minilm-tsdae") return "Sorani MiniLM · local TSDAE";
  if (key === "minilm") return "Base multilingual MiniLM";
  return label;
}

export function compactSourceLabel(title: string) {
  return title.replace(/\s+—.*$/, "");
}

export function topicDisplayName(name: string) {
  return name.replace(/^\d+_/, "").replaceAll("_", " · ");
}
