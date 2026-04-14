import pkg from 'pg';
const { Pool } = pkg;

async function fixDatabase() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:2611@localhost:5432/aptico"
  });
  
  try {
    console.log('Restoring permissions to the public schema...');
    
    // Make sure the schema exists
    await pool.query('CREATE SCHEMA IF NOT EXISTS public;');
    
    // Grant full permissions back to the default roles
    await pool.query('GRANT ALL ON SCHEMA public TO postgres;');
    await pool.query('GRANT ALL ON SCHEMA public TO public;');
    
    console.log(' Permissions restored perfectly!');
  } catch (error) {
    console.error(' Error fixing database:', error);
  } finally {
    await pool.end();
  }
}

fixDatabase();