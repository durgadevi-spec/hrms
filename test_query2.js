import db from './server/timestrapDb.js';
db.query("SELECT employee_name, date, status FROM public.time_entries WHERE date = '2026-06-26'").then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(console.error);
