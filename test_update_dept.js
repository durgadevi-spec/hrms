import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const id = '9cd7d5f6-161f-4716-b72a-a4189969ab14'; // From the screenshot
  const updateData = {
    name: 'software',
    manager_ids: ['d1c98258-24d0-44b0-8bb1-73bcbba92f09', '872bfe16-6422-471c-8b45-f4a3fb748486']
  };
  
  console.log('Sending:', updateData);
  const { data, error } = await supabase
    .from('departments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

test();
