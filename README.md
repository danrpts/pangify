# Pangify
Use pangify to convert your poly,coor files into a
friendly javascript format.

## Install
npm install -g pangify

## Usage
pangify {OPTIONS} [MODEL ...]

`MODEL` is the path and name of a file. Omit the extension and see option `-i`.

`OPTIONS` are:

	-i      Comma seperated input extensions. Default is -i poly,coor

	-d      Set ouput directory. Default is the path to file.

	-v      Show tokenized ouput. For debugging.


## Model Data
Here is one way to get a set of poly and coor files

`wget -A poly,coor -m -nd https://users.soe.ucsc.edu/~pang/160/s15/data/`
