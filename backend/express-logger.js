// backend/express-logger.js
module.exports = (logger) => (req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6; // numeric ms
    logger.info({
      marker: 'http_request',
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode,
      duration_ms: ms
    }, 'req done');
  });
  next();
};
