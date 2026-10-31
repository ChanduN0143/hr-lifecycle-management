const {Pool}=require('pg');
let pool;
function getPool(){ if(!pool){ if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for database-backed endpoints'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='true'?{rejectUnauthorized:false}:false}); } return pool; }
async function query(text,params){return getPool().query(text,params)}
module.exports={query,getPool};
