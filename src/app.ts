import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import csrf from 'csurf';
import path from 'path';
import { fileURLToPath } from 'url';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';

// Import routes
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import visitRoutes from './routes/visits.js';
import billingRoutes from './routes/billing.js';
import adminRoutes from './routes/admin.js';

// Import middleware
import { requireAuth, redirectIfAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize i18next
await i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    lng: 'ar',
    fallbackLng: 'ar',
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'clinic-os-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// i18next middleware
app.use(i18nextMiddleware.handle(i18next));

// CSRF protection (applied after session)
const csrfProtection = csrf({ cookie: true });

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/uploads', requireAuth, express.static(path.join(__dirname, '../uploads')));

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  next();
});

// Routes
app.use('/auth', csrfProtection, authRoutes);
app.use('/', requireAuth, csrfProtection, dashboardRoutes);
app.use('/patients', requireAuth, csrfProtection, patientRoutes);
app.use('/appointments', requireAuth, csrfProtection, appointmentRoutes);
app.use('/visits', requireAuth, csrfProtection, visitRoutes);
app.use('/billing', requireAuth, csrfProtection, billingRoutes);
app.use('/admin', requireAuth, csrfProtection, adminRoutes);

// Root redirect
app.get('/', redirectIfAuth('/auth/login'), (req, res) => {
  res.redirect('/dashboard');
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).render('error', {
      title: req.t('error.csrf_title'),
      message: req.t('error.csrf_message'),
      code: 403
    });
    return;
  }
  
  res.status(500).render('error', {
    title: req.t('error.server_title'),
    message: req.t('error.server_message'),
    code: 500
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: req.t('error.not_found_title'),
    message: req.t('error.not_found_message'),
    code: 404
  });
});

export default app;
