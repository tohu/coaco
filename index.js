var express = require('express');
 var session = require('express-session');
var url = require('url');
var bodyParser = require('body-parser');
var jsonfile = require('jsonfile');
var Storage = require('node-storage');

var app = express();

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

var sess;
var sessionsFilePath = 'data/sessions.json';
var sessions = null;

try {
  sessions = jsonfile.readFileSync(sessionsFilePath) || {};
}
catch(e) {
  if(e.errno === -4058) {
    sessions = {};
  }
  else {
    console.log(e);
    sessions = null;
  }
}

var sstore = new Storage('data/node-storage');

app.use('/', express.static(__dirname + '/public'));
app.use('/data', express.static(__dirname + '/public/data'));


app.get('/test', function(req, res) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  var sess = req.session;

  var visits = sstore.get(sess+'.visits') || 0;
  visits++;
  sstore.put(sess+'.visits', visits);

  var result = query;
  result.visits = visits;
  res.json(query);
});

app.post('/', function(req, res) {
  res.json(req.body);
});


function exitHandler(options, err) {
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);

    if(sessions)
      jsonfile.writeFileSync(sessionsFilePath, sessions);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on port " + port);
});