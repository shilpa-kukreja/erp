import env from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';

(async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`🚀 Backend running on port ${env.PORT} (${env.NODE_ENV})`);
  });
})();