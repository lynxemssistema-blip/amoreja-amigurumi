require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function reset() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Trying to update user password & confirm email...');

  // First get the user id
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === 'amorejaamigurumi@gmail.com');
  if (!user) {
    console.log('User not found in Supabase Auth!');
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { 
        password: '27090033Mar**',
        email_confirm: true 
    }
  );

  if (error) {
    console.error('Error updating user:', error);
  } else {
    console.log('Successfully updated password and confirmed email for:', data.user.email);
  }
}

reset();
