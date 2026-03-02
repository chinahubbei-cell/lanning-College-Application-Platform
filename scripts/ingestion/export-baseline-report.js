#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.split('='))
    .filter((x) => x.length >= 2)
    .map(([k, ...v]) => [k, v.join('=')])
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const report = { generatedAt: new Date().toISOString() };

  const [u, m, a] = await Promise.all([
    supabase.from('universities').select('id,province', { count: 'exact' }),
    supabase.from('majors').select('id', { count: 'exact' }),
    supabase.from('admission_scores').select('id,year,province', { count: 'exact' }),
  ]);

  if (u.error || m.error || a.error) {
    console.error('query error', u.error || m.error || a.error);
    process.exit(1);
  }

  report.counts = {
    universities: u.count,
    majors: m.count,
    admission_scores: a.count,
  };

  report.coverage = {
    province_count_universities: new Set((u.data || []).map((x) => x.province).filter(Boolean)).size,
    province_count_admission_scores: new Set((a.data || []).map((x) => x.province).filter(Boolean)).size,
    years_admission_scores: [...new Set((a.data || []).map((x) => x.year).filter(Boolean))].sort(),
  };

  fs.mkdirSync('docs/reports', { recursive: true });
  const p = `docs/reports/2026-03-02-national-baseline-report.json`;
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
  console.log(`written ${p}`);
}

main();
