import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://arxctoxrbfnpokejqhfz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGN0b3hyYmZucG9rZWpxaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjkxMDcsImV4cCI6MjA3OTcwNTEwN30.kLrxuVJ9yol8Lwsb2f5Uba5AOZP_CGP_UTQqqAsKXLQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data, error } = await supabase.from('team_members').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

main();
