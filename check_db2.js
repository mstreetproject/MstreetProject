const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nforoejplnflevqvxlru.supabase.co',
  process.env.SUPABASE_SECRET_KEY
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
