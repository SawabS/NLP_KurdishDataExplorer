/** Single home for display-name shortening (was duplicated in ExplorePage and UploadPage).
 *  Model names are no longer shortened here: the API serves the provider and the
 *  exact model id, and both are shown verbatim wherever a run is described. */

export function compactSourceLabel(title: string) {
  // Drop a trailing " — subtitle" and any uploaded-file extension so the
  // corpus name stays short in selects, breadcrumbs, and the command palette.
  return title.replace(/\s+—.*$/, "").replace(/\.(txt|text|csv|tsv|xlsx|xls|parquet)$/i, "");
}

export function topicDisplayName(name: string) {
  return name.replace(/^\d+_/, "").replaceAll("_", " · ");
}
