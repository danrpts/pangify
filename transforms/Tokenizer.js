var path = require("path"),
    through2 = require("through2");

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

// Rules with setter
var rules = [];
function addRule(expression, name) {
  rules.push({regex: expression, type: name});
}

// Rules to test agaist; first hit wins; very adhoc. See TODO.
addRule(/^\d+$/,                                  "total");
addRule(/^\d+(?:[, \t]+[+-]?\d+(?:.?\d+)?){3}$/,  "coordinate");
addRule(/^\w+(?:[, \t]+\d+)$/,                    "point");
addRule(/^\w+(?:[, \t]+\d+){2}$/,                 "line");
addRule(/^\w+(?:[, \t]+\d+){3,}$/,                "polygon");
addRule(/^.*$/,                                   "invalid");

// The actual regex tester
function tokenize (string) {
  string = string.trim();
  var token = rules.find(function(rule) {
    return rule.regex.test(string);
  });
  return {lexeme: string, type: token.type};
}

// The transform tokenizer stream
module.exports = through2.ctor(function (line, enc, callback) {
  var token = tokenize(line);
  token.parent = path.basename(this.options.name);
  if (this.options.v) logger.log(JSON.stringify(token)); // spew out tokens
  this.push(token);
  callback();
}, function (callback) {

  // logger.warn("Have anything to be done between tokenizer and the next transform?");
  callback();
});
