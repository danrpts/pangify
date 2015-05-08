var through2 = require("through2");

// Pool the stream into an array. This could be smarter.
module.exports = through2.ctor(function (token, enc, callback) {

  if (!Array.isArray(this.store)) this.store = [];

  switch (token.type) {

    case "total":
      this.store[0] = parseInt(token.lexeme);
      break;

    case "polygon":
      var lexemes = token.lexeme.split(/[, \t]+/);
      lexemes.forEach(function(item, index) {
        if (/\d+/.test(item) && /\W+/.test(item)) lexemes[index] = parseInt(item);
      });
      this.store.push(lexemes);
      break;

    case "coordinate":
      var lexemes = token.lexeme.split(/[, \t]+/);
      lexemes.forEach(function(item, index) {
        if (/\d+/.test(item)) lexemes[index] = parseFloat(item);
      });
      lexemes.shift(); // omit the index; can use it in json form
      this.store.push(lexemes);
      break;

    default: break;
  }
  callback();
}, function (callback) {

  // send entire array as object chunk
  this.push(this.store);
  callback();
});
