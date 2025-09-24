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

const ExpressError = require("./utils/ExpressError");
const User = require("./models/user");

// Routes
const userRoutes = require("./routes/users");
const campgroundRoutes = require("./routes/campgrounds");
const reviewRoutes = require("./routes/reviews");
const apiRoutes = require("./routes/api"); // JSON API

// NOTE: This import style matches connect-mongo v3 API.
// If you upgrade to v4+, the API changes to MongoDBStore.create({ mongoUrl, ... }).
const MongoDBStore = require("connect-mongo")(session);

// Prefer container hostname "mongo" as Docker default, but fix Atlas URLs if they omit the DB name.
let dbUrl = process.env.DB_URL || "mongodb://mongo:27017/yelpcamp";

// If the URI has no explicit database segment, append /yelpcamp before any ?query
try {
  const [base, qs = ""] = dbUrl.split("?");
  const looksLikeMongo = /^mongodb(\+srv)?:\/\//.test(dbUrl);
  const hasDbName = /\/[^/?]+$/.test(base); // ends with /dbname
  if (looksLikeMongo && !hasDbName) {
    dbUrl = `${base.replace(/\/?$/, "/yelpcamp")}${qs ? `?${qs}` : ""}`;
  }
} catch (_) {
  // ignore and use whatever dbUrl already is
}

// ✅ Mongoose connection (with a boot-time sanity log)
mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Database connected:", {
      name: mongoose.connection.name,
      host: mongoose.connection.host,
    });
    try {
      const n = await mongoose.connection.db
        .collection("campgrounds")
        .countDocuments();
      console.log("[BootCheck] campgrounds =", n);
    } catch (e) {
      console.error("[BootCheck] count failed:", e.message);
    }
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

const app = express();

// --- CORS: allow calls from the deployed Static Site (and optional local dev)
const cors = require("cors");
const allowed = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (allowed.length) {
  // Example: FRONTEND_ORIGIN="https://your-site.onrender.com,http://localhost:5173"
  app.use(cors({ origin: allowed, credentials: true }));
  app.options("*", cors()); // preflight
}


app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(mongoSanitize({ replaceWith: "_" }));

const secret = process.env.SECRET || "thisshouldbeabettersecret!";

const store = new MongoDBStore({
  url: dbUrl,
  secret,
  // after 1 day, update the session; otherwise update only when something changes
  touchAfter: 24 * 60 * 60,
});

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e);
});

const sessionConfig = {
  store,
  name: "session",
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: true, // uncomment when serving over HTTPS
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(session(sessionConfig));
app.use(flash());

// Helmet base (CSP disabled here because we set it explicitly below)
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

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Locals (flash, user, and Mapbox token for EJS)
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.mapboxToken = process.env.MAPBOX_TOKEN || ""; // <-- added
  next();
});

// --- Health check ---
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 == connected
  return res
    .status(200)
    .json({ status: "ok", db: dbState === 1 ? "connected" : dbState });
});

// --- Simple ping (handy for container health/debug) ---
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, service: "backend", time: new Date().toISOString() });
});

// --- JSON API (for programmatic clients) ---
app.use("/api", apiRoutes);

// --- EJS routes ---
app.use("/", userRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

// Home
app.get("/", (req, res) => {
  res.render("home");
});

// 404
app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

// Error handler
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Oh No, Something Went Wrong!";
  res.status(statusCode).render("error", { err });
});

const port = process.env.PORT || 3000;
// Bind to all interfaces so it's reachable from the host/container network
app.listen(port, "0.0.0.0", () => {
  console.log(`Serving on port ${port}`);
});
