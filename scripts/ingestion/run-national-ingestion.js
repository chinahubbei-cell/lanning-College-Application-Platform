#!/usr/bin/env node
/*
 * National ingestion runner scaffold
 * Usage:
 *   node scripts/ingestion/run-national-ingestion.js --dry-run
 *   node scripts/ingestion/run-national-ingestion.js --source provincial_exam --province 浙江 --year 2025
 */

import fs from 'fs';
import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const cfgPath = path.resolve('configs/national-sources.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const selectedSources = args.source
  ? cfg.sources.filter((s) => s.id === args.source)
  : cfg.sources;

const selectedProvinces = args.province ? [args.province] : cfg.provinces;
const selectedYears = args.year ? [Number(args.year)] : cfg.years;
const dryRun = !!args['dry-run'];

const tasks = [];
for (const source of selectedSources) {
  for (const province of selectedProvinces) {
    for (const year of selectedYears) {
      tasks.push({ source: source.id, province, year, status: 'queued' });
    }
  }
}

console.log(`[ingestion] tasks=${tasks.length} dryRun=${dryRun}`);

for (const task of tasks) {
  if (dryRun) {
    console.log(`[dry-run] ${task.source} | ${task.province} | ${task.year}`);
    continue;
  }

  // TODO: connect parser/fetcher implementation per source.
  console.log(`[run] ${task.source} | ${task.province} | ${task.year} -> TODO parser`);
}

console.log('[ingestion] done');
