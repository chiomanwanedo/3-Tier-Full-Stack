// Minimal pass-through middleware so app can start.
// Replace with real logic later (auth, validation, authorship checks).

const storeReturnTo = (req, res, next) => next();
const isLoggedIn = (req, res, next) => next();
const isAuthor = (req, res, next) => next();
const isReviewAuthor = (req, res, next) => next();
const validateCampground = (req, res, next) => next();
const validateReview = (req, res, next) => next();

module.exports = {
  storeReturnTo,
  isLoggedIn,
  isAuthor,
  isReviewAuthor,
  validateCampground,
  validateReview
};
