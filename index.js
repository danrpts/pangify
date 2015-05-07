#! /usr/bin/env node

var fs = require("fs"),
    path = require("path"),
    mini = require("minimist"),
    Logdown = require("logdown");

var LineStream = require("byline").LineStream,
    Tokenizer = require('./transforms/Tokenizer.js'),
    Arrayify = require('./transforms/Arrayify.js'),
    Stringify = require('./transforms/Stringify.js');

// Pretty logs
var logger = new Logdown({prefix: '[pangify]'});

// Args
var argv = mini(process.argv.slice(2)),
    models = argv._,
    flags = {
      d: argv.d,
      i: (argv.i) ? argv.i.split(',') : "poly coor".split(' '), // input file formats. See TODO.
      o: argv.o || 'js', // output file formats. See TODO.
      v: verbose = argv.v || false,
    };


// The actual stream pipeline
function execute (job) {

  // Setup some config
  var path = job.path,
      name = job.name,
      input = job.input,
      output = job.output,
      pre = 'var ' + name + ' = ',
      post = ';\n';

  // Setup transform streams
  var linestream = new LineStream(),
      tokenizer = new Tokenizer({objectMode: true, name: name, logger: logger, flags: flags}),
      arrayify = new Arrayify({objectMode: true, logger: logger, flags: flags}),
      stringify = new Stringify({objectMode: true, prefix: pre, postfix: post, logger: logger, flags: flags});

  // https://nodejs.org/api/stream.html#stream_event_end
  stringify.on('end', function () {
    input.emit('done'); // start next
  });

  logger.info("Processing*",path,"*...");

  // https://nodejs.org/api/stream.html#stream_readable_pipe_destination_options
  input
  .pipe(linestream)
  .pipe(tokenizer)
  .pipe(arrayify)
  .pipe(stringify)
  .pipe(output, {end: false});
}

models.forEach(function (model, mid) {

  // Open output file. This was a last minute addition so it may have bugs.
  var outfile = (flags.d) ? path.join(path.normalize(flags.d), path.basename(model)) : model,
      outfile = path.normalize(outfile + '.' + flags.o.trim()),
      outstream = fs.createWriteStream(outfile, {
        flags: 'w',
        encoding: "ascii",
        autoClose: true
      });

  // For each input file type, i.e. .poly, .coor, etc..
  flags.i.forEach(function (iext, eid) {

    // Open input file
    var infile = path.normalize(model + '.' + iext.trim());

    fs.exists(infile, function (exists) {

      if (exists) {

        var name = path.basename(infile).replace(/\./, '_'),
            instream = fs.createReadStream(infile, {
              flags: 'r',
              encoding: "ascii",
              autoClose: true
            });

        // Inform us when the pipeline is pretty much done
        instream.on('done', function () {
          logger.info("Written*",name,"*to*",outfile,"*");
        });

        // Process asynchronously
        execute({
          path: infile,
          name: name,
          input: instream,
          output: outstream

        });

      } else logger.warn("*",infile,"*does not exist.");

    });
  });
});
