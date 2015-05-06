// Deps
require("./polyfill.js");
var fs = require("fs");
var path = require("path");
var mini = require("minimist");
var Logdown = require("logdown");
var through2 = require("through2");
var argv = mini(process.argv.slice(2));
var LineStream = require("byline").LineStream;
// Pretty logs
var logger = new Logdown({prefix: '[pangify]'});

// Args
var models = argv._;
var iexts = argv.i || "poly,coor";
var oext = argv.o || 'pang';
iexts = iexts.split(',');

// Rules with setter
var rules = [];
function addRule(expression, name) {
  rules.push({regex: expression, type: name});
}

// Rules to test agaist; first hit wins
addRule(/^\d+$/,                                  "total"); // use for checking successfull entry
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
var Tokenizer = through2.ctor(function (line, enc, callback) {
  var token = tokenize(line);
  token.parent = path.basename(this.options.name);
  this.push(JSON.stringify(token).concat('\n'));
  callback();
}, function (callback) {
  // this.push("Have anything to be done between reads?\n");
  callback();
});

// The goal is synchronicity between writes here. We will queue jobs in the correct order and
/// then process them synchronously.
//// http://stackoverflow.com/questions/21767927/node-js-writing-two-readable-streams-into-the-same-writable-stream
var queue = [];

// Just to keep track of jobs
var qid = 0;

// The actual stream pipeline
function execute (job) {
  logger.info("Starting job *#", job.id, job.name, "*");

  // Init some transforms
  var linestream = new LineStream({objectMode: true});
  var tokenizer = new Tokenizer({objectMode: true, id: job.id, name: job.name});

  // All has been read from this transform stream.. I think..
  // https://nodejs.org/api/stream.html#stream_event_end
  tokenizer.on('end', function () {
    job.instream.emit('shift'); // shift self from queue
  });

  // The magic
  job.instream
  .pipe(linestream)
  .pipe(tokenizer)
  //.pipe(make_javascript_from_tokens)
  .pipe(job.outstream, {end: false}); // https://nodejs.org/api/stream.html#stream_readable_pipe_destination_options
}

// Here we go
// For each model
// Open all streams for writing a specific pangfile.
models.forEach(function (model, mid) {

  // Setup output file
  var outfile = path.normalize(model + '.' + oext.trim());
  var writeOptions = {
    flags: 'w',
    encoding: "ascii"
  };

  // Output stream
  var pangfile = fs.createWriteStream(outfile, writeOptions);

  // For each input file type, i.e. .poly, .coor, etc..
  iexts.forEach(function (iext, eid) {

    // Setup input file
    var infile = path.normalize(model + '.' + iext);
    var readOptions = {
      flags: 'r',
      encoding: "ascii"
    };

    // Queue a job with an input stream
    var job = {
      id: ++qid,
      name: infile,
      instream: fs.createReadStream(infile, readOptions),
      outstream: pangfile
    };
    queue.push(job);

    // Bind to the shift event so that we can process the next job
    /// This is the heart of the synchronous behavior
    job.instream.on('shift', function () {
      logger.info("Finished job *#", job.id, job.name, "*");
      if (queue.length > 0) execute(queue.shift());
    });

  });

  // Close outstream somehow once all writes are done

});

// Kick it off and process the first input
logger.info("There are*",queue.length,"*jobs in the queue...");
execute(queue.shift());
