// backend/routes/api.js
const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");

// GET /api/ping — health/ping for the frontend
router.get("/ping", (req, res) => {
  res.json({ ok: true, service: "backend", time: new Date().toISOString() });
});

// GET /api/campgrounds — minimal JSON list for the React UI
router.get("/campgrounds", async (req, res, next) => {
  try {
    const camps = await Campground.find({})
      .select("_id title location price")
      .sort({ _id: -1 })
      .lean()
      .exec();
    res.json({ ok: true, count: camps.length, campgrounds: camps });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
