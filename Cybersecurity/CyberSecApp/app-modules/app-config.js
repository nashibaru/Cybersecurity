// config/appConfig.js
import { static as expressStatic } from 'express'; // żeby mieć express.static itp.
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import pkg from 'body-parser';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';

const { urlencoded } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function configureApp(app, {
  authRoutes = null,
  userRoutes = null,
  adminSettingsRoutes = null,
  adminUsersRoutes = null,
  sessionSecret = process.env.SESSION_SECRET,
  sessionOptions = {}
} = {}) {
  // podstawowe middleware

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.use(helmet());

  // session store (connect-sqlite3 wymaga przekazania factory z session)
  const SQLiteStore = SQLiteStoreFactory(session);
  const defaultSessionOpts = {
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
    secret: sessionSecret || 'zmien-ten-secret-w-produkcji',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 10*1000 }
  };

  app.use(session(Object.assign(defaultSessionOpts, sessionOptions)));
  app.use(expressStatic(join(__dirname, '..', 'public')));
  app.set('view engine', 'ejs');
  app.use(urlencoded({ extended: true }));

  // domyślny title dla widoków
  app.use((req, res, next) => {
    res.locals.title = 'Panel logowania';
    next();
  });

  // jawne montowanie routerów — tylko jeśli zostały przekazane
  if (authRoutes) app.use('/', authRoutes);
  if (userRoutes) app.use('/user', userRoutes);
  if (adminSettingsRoutes) app.use('/admin', adminSettingsRoutes);
  if (adminUsersRoutes) app.use('/admin', adminUsersRoutes);
  if (adminLogsRoutes) app.use('/admin', adminLogsRoutes);
  
  return app;
};
