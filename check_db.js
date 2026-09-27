const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('repayment_transactions')
    .select('*');

  if (error) {
    console.error('Error querying table:', error.message);
  } else {
    console.log(`Table exists. Found ${data.length} rows.`);
    console.log(data);
  }
}

check();
