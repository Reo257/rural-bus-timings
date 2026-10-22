/* ===== Configuration ======================================================
   This site is built to be hosted as STATIC FILES (GitHub Pages, Netlify,
   any web host). Static hosting cannot run server code, so with the default
   settings below, every timing a passenger reports is saved IN THAT USER'S
   OWN BROWSER ONLY.

   That is enough to try the feature and to use it as a personal notebook,
   but reported timings are NOT shared between visitors. There is no server
   to share them through.

   To make reports visible to everyone you need a small hosted database.
   Supabase has a free tier and talks to a static page directly:

     1. Sign up at https://supabase.com and create a project
     2. Open the SQL editor and run the contents of supabase.sql
     3. Project Settings -> API, copy the Project URL and the "anon public" key
     4. Paste them below and re-deploy

   The anon key is safe to publish — it is a public key, and row-level
   security in the database is what actually protects the data.
   NEVER put the "service_role" key in this file: that one bypasses all
   security and must stay server-side.
   ========================================================================= */

var CONFIG = {
  supabaseUrl:     '',   // e.g. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',   // Project Settings -> API -> anon public
  table:           'bus_timings'
};
