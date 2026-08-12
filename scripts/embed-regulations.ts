// ============================================================
// AuditPilot — Embed Regulation Chunks
// ============================================================
//
// Run this ONCE after running seed_popia_regulations.sql.
// It finds all regulation_chunks rows with a NULL embedding,
// generates embeddings via Voyage AI, and updates them.
//
// Usage:
//   npx tsx scripts/embed-regulations.ts
//
// Requires in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VOYAGE_API_KEY
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const EMBEDDING_MODEL = 'voyage-3-lite';

async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY not set in .env.local');

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: 'document',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voyage API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Fetching regulation chunks without embeddings...');

  const { data: chunks, error } = await supabase
    .from('regulation_chunks')
    .select('id, chunk_text, section_reference')
    .is('embedding', null);

  if (error) throw error;

  if (!chunks || chunks.length === 0) {
    console.log('No chunks need embedding. Done.');
    return;
  }

  console.log(`Found ${chunks.length} chunks to embed.`);

  const texts = chunks.map(c => c.chunk_text);
  const embeddings = await embedTexts(texts);

  console.log('Embeddings generated. Updating database...');

  for (let i = 0; i < chunks.length; i++) {
    const { error: updateError } = await supabase
      .from('regulation_chunks')
      .update({ embedding: embeddings[i] })
      .eq('id', chunks[i].id);

    if (updateError) {
      console.error(`Failed to update chunk ${chunks[i].section_reference}:`, updateError.message);
    } else {
      console.log(`  ✓ Embedded: ${chunks[i].section_reference}`);
    }
  }

  console.log(`\nDone. ${chunks.length} regulation chunks embedded and ready for search.`);
}

main().catch(err => {
  console.error('Embedding script failed:', err);
  process.exit(1);
});
