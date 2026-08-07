'use strict';

module.exports = async (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Lyrics Bot keep-alive ping',
    timestamp: new Date().toISOString(),
  });
};
