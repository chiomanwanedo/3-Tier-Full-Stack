// Load env in non-production
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const passport = require("passport");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const LocalStrategy = require("passport-local");
const mongoSanitize = require("express-mongo-sanitize");

// ===== Logging (pino → Loki over HTTP Bearer) =====
const pino = require("pino");
function buildLogger() {
  const level = process.env.LOG_LEVEL || "info";
  const lokiUrl = process.env.LOKI_URL;         // e.g. https://logs-prod-XXX.grafana.net/loki/api/v1/push
  const lokiBearer = process.env.LOKI_BEARER;   // e.g. "1234567:glc_...."
  if (lokiUrl && lokiBearer) {
    const labels = Object.fromEntries(
      (process.env.LOKI_LABELS || "service=backend,env=prod")
        .split(",")
        .map(kv => kv.split("=").map(s => s.trim()))
        .filter(([k, v]) => k && v)
    );
    const transport = pino.transport({
      target: "pino-loki",
      options: {
        batching: true,
        interval: 2000,
        host: lokiUrl,
        headers: { Authorization: `Bearer ${lokiBearer}` },
        labels,
      },
    });
    return pino({ level }, transport);
  }
  // pretty in dev / plain in prod stdout
  const pretty =
    process.env.NODE_ENV !== "production"
      ? pino.transport({ target: "pino-pretty", options: { colorize: true } })
      : undefined;
  return pino({ level }, pretty);
}
const logger = buildLogger();

// ===== App / DB bootstrap =====
const ExpressError = require("./utils/ExpressError");
const User = require("./models/user");

// Routes
const userRoutes = require("./routes/users");
const campgroundRoutes = require("./routes/campgrounds");
const reviewRoutes = require("./routes/reviews");
const apiRoutes = require("./routes/api"); // JSON API

// NOTE: connect-mongo v3 API (as in your project)
const MongoDBStore = require("connect-mongo")(session);

// Prefer container hostname "mongo" by default
const dbUrl = process.env.DB_URL || "mongodb://mongo:27017/yelpcamp";

// Mongoose connection
mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info({ dbUrl: dbUrl.replace(/\/\/.*@/, "//***:***@") }, "✅ Database connected"))
  .catch((err) => {
    logger.error({ err }, "❌ Database connection error");
    process.exit(1);
  });

const app = express();

// ===== Optional CORS (only if FRONTEND_ORIGIN set; keep disabled for backend-only) =====
try {
  const cors = require("cors");
  const allowed = (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length) {
    app.use(cors({ origin: allowed, credentials: true }));
    app.options("*", cors());
    logger.info({ allowed }, "CORS enabled for specified origins");
  } else {
    logger.info("CORS not enabled (no FRONTEND_ORIGIN set)");
  }
} catch {
  // cors not installed; ignore silently
}

// ===== Express config =====
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(mongoSanitize({ replaceWith: "_" }));

// Minimal HTTP access log
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    logger.info({
      msg: "http",
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - t0,
    });
  });
  next();
});

const secret = process.env.SECRET || "thisshouldbeabettersecret!";
const store = new MongoDBStore({
  url: dbUrl,
  secret,
  touchAfter: 24 * 60 * 60,
});
store.on("error", (e) => logger.error({ err: e }, "SESSION STORE ERROR"));

const sessionConfig = {
  store,
  name: "session",
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: true, // enable when enforcing HTTPS
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));
app.use(flash());

// Helmet (CSP explicitly configured below)
app.use(helmet({ contentSecurityPolicy: false }));

const scriptSrcUrls = [
  "https://stackpath.bootstrapcdn.com/",
  "https://api.tiles.mapbox.com/",
  "https://api.mapbox.com/",
  "https://kit.fontawesome.com/",
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
  "https://kit-free.fontawesome.com/",
  "https://stackpath.bootstrapcdn.com/",
  "https://api.mapbox.com/",
  "https://api.tiles.mapbox.com/",
  "https://fonts.googleapis.com/",
  "https://use.fontawesome.com/",
];
const connectSrcUrls = [
  "https://api.mapbox.com/",
  "https://a.tiles.mapbox.com/",
  "https://b.tiles.mapbox.com/",
  "https://events.mapbox.com/",
];
const fontSrcUrls = [];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: [
        "'self'",
        "blob:",
        "data:",
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ""}/`,
        "https://images.unsplash.com/",
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Locals for templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.mapboxToken = process.env.MAPBOX_TOKEN || "";
  next();
});

// ===== Health & diagnostics =====
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(200).json({
    status: "ok",
    db: dbState === 1 ? "connected" : dbState,
    time: new Date().toISOString(),
  });
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, service: "backend", time: new Date().toISOString() });
});

// ===== API + EJS routes =====
app.use("/api", apiRoutes);
app.use("/", userRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

app.get("/", (req, res) => res.render("home"));

// 404
app.all("*", (req, res, next) => next(new ExpressError("Page Not Found", 404)));

// Error handler
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Oh No, Something Went Wrong!";
  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res.status(statusCode).render("error", { err });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Serving on port");
});
