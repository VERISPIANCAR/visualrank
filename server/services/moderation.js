const Filter = require('bad-words');

const filter = new Filter();
filter.addWords('spam', 'garbage', 'scam');

function sanitizeComment(text = '') {
  const isFlagged = filter.isProfane(text);
  const sanitized = filter.clean(text);
  return { sanitized, isFlagged };
}

module.exports = { sanitizeComment };