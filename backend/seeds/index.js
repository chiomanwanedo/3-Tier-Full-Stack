// seeds/index.js
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const Campground = require('../models/campground');
const User = require('../models/user');
const cities = require('./cities');
const { descriptors, places } = require('./seedHelpers');

/* ====== CONFIG ====== */
const DB_URL = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelpcamp'; // no dash
const SEED_COUNT = Number(process.env.SEED_COUNT || 30);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

/* ====== DB CONNECT ====== */
async function connect() {
  await mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ Connected for seeding');
}

/* ====== HELPERS ====== */
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function ensureAdmin() {
  let user = await User.findOne({ username: ADMIN_USERNAME });
  if (!user) {
    user = new User({ username: ADMIN_USERNAME, email: ADMIN_EMAIL });
    await User.register(user, ADMIN_PASSWORD); // passport-local-mongoose
    console.log(`🟢 Admin user created: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`ℹ️ Admin user exists: ${ADMIN_USERNAME}`);
  }
  return user._id;
}

function haveCloudinaryCreds() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_KEY &&
      process.env.CLOUDINARY_SECRET
  );
}

function localSeedImagePaths() {
  const files = ['seed1.jpg', 'seed2.jpg']
    .map((f) => path.join(__dirname, 'seed-img', f))
    .filter((p) => fs.existsSync(p));
  if (files.length === 0) {
    console.warn('⚠️ No local seed images found; will use Unsplash placeholders.');
  }
  return files;
}

async function prepareImages() {
  const localPaths = localSeedImagePaths();

  // If Cloudinary creds exist, upload and use Cloudinary URLs
  if (haveCloudinaryCreds() && localPaths.length) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET
    });

    const uploads = [];
    for (const p of localPaths) {
      const publicId = `seed-img/${path.basename(p, path.extname(p))}`;
      const res = await cloudinary.uploader.upload(p, {
        folder: 'seed-img',
        public_id: path.basename(p, path.extname(p)),
        use_filename: true,
        unique_filename: false
      });
      console.log(`📸 Uploaded to Cloudinary: ${res.secure_url}`);
      uploads.push({ url: res.secure_url, filename: publicId });
    }
    return uploads;
  }

  // Else: copy to /public/seed-img and use local URLs
  if (localPaths.length) {
    const dstDir = path.join(__dirname, '..', 'public', 'seed-img');
    fs.mkdirSync(dstDir, { recursive: true });
    for (const p of localPaths) {
      const dst = path.join(dstDir, path.basename(p));
      fs.copyFileSync(p, dst);
    }
    const urls = localPaths.map((p) => ({
      url: `/seed-img/${path.basename(p)}`,
      filename: path.basename(p)
    }));
    console.log('📸 Using local images:', urls.map((u) => u.url).join(', '));
    return urls;
  }

  // Fallback Unsplash
  return [
    {
      url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
      filename: 'unsplash1'
    },
    {
      url: 'https://images.unsplash.com/photo-1526481280698-8fcc13fd6f90',
      filename: 'unsplash2'
    }
  ];
}

/* ====== MAIN ====== */
async function main() {
  await connect();
  const authorId = await ensureAdmin();
  const seedImages = await prepareImages();

  // Clear only campgrounds (not users)
  await Campground.deleteMany({});
  console.log('🧹 Cleared existing campgrounds');

  const totalCities = cities.length || 0;
  for (let i = 0; i < SEED_COUNT; i++) {
    const idx = Math.floor(Math.random() * totalCities);
    const c = cities[idx] || {};
    const price = Math.floor(Math.random() * 20) + 10;

    const images = [
      seedImages[i % seedImages.length],
      seedImages[(i + 1) % seedImages.length]
    ];

    const camp = new Campground({
      author: authorId,
      title: `${sample(descriptors)} ${sample(places)}`,
      location: [c.city, c.state || c.admin_name].filter(Boolean).join(', '),
      description:
        'A lovely campground with scenic views and basic amenities.',
      price,
      images,
      ...(c.longitude && c.latitude
        ? { geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] } }
        : {})
    });

    await camp.save();
  }

  console.log(`✅ Seeded ${SEED_COUNT} campgrounds`);
  await mongoose.connection.close();
  console.log('🔌 Closed DB connection');
}

main().catch(async (err) => {
  console.error('❌ Seed error:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
