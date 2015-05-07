var through2 = require("through2");

// Transform objects into strings for writing to file
module.exports = through2.ctor(function (chunk, enc, callback) {
  var prefix = this.options.prefix || '';
  var postfix = this.options.postfix || '\n';
  this.push(prefix + JSON.stringify(chunk) + postfix);
  callback();
}, function (callback) {

  // logger.warn("Have anything to be done between stringify and the next transform?");
  callback();
});
