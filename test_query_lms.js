import db from './server/lmsDb.js';
db.query("SELECT * FROM public.leaves WHERE status = 'Approved'").then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(console.error);
