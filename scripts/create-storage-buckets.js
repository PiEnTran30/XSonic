/**
 * Script to create storage buckets in Supabase
 * Run: node scripts/create-storage-buckets.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBuckets() {
  console.log('🚀 Creating storage buckets...\n');

  const buckets = [
    {
      id: 'uploads',
      name: 'uploads',
      public: true,
      fileSizeLimit: 524288000, // 500MB
      allowedMimeTypes: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/flac',
        'audio/aac',
        'audio/m4a',
        'audio/webm',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo'
      ]
    },
    {
      id: 'results',
      name: 'results',
      public: true,
      fileSizeLimit: 524288000, // 500MB
      allowedMimeTypes: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/flac',
        'audio/aac',
        'audio/m4a',
        'audio/webm',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo'
      ]
    }
  ];

  for (const bucket of buckets) {
    console.log(`📦 Creating bucket: ${bucket.id}...`);
    
    // Check if bucket exists
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    const exists = existingBuckets?.some(b => b.id === bucket.id);

    if (exists) {
      console.log(`   ✅ Bucket "${bucket.id}" already exists\n`);
      continue;
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes
    });

    if (error) {
      console.error(`   ❌ Error creating bucket "${bucket.id}":`, error.message);
    } else {
      console.log(`   ✅ Bucket "${bucket.id}" created successfully\n`);
    }
  }

  console.log('✅ All buckets created!\n');
  
  // List all buckets
  const { data: allBuckets } = await supabase.storage.listBuckets();
  console.log('📋 Current buckets:');
  allBuckets?.forEach(b => {
    console.log(`   - ${b.id} (${b.public ? 'public' : 'private'})`);
  });
}

createBuckets().catch(console.error);

