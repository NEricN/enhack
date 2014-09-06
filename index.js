var express = require('express');
var mongoose = require('mongoose');
var nunjucks = require('nunjucks');
var app = express();

var routes = require('./routes');

var uristring = "mongodb://admin:admin@ds035260.mongolab.com:35260/enhack";

mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});

nunjucks.configure('views', {
	autoescape: true,
	express: app
})

var userSchema = new mongoose.Schema({
	id: String,
	email: String,
	token: String
})

var noteSchema = new mongoose.Schema({
	guid: String,
	ownerGuid: String,
	tags: {type: [String], index: true },
	description: String,
	likes: {type: Number, default: 0},
	downloads: {type: Number, default: 0},
	views: {type: Number, default: 0}
})

var User = mongoose.model("User", userSchema);
var Note = mongoose.model("Note", noteSchema);

app.set('port', (process.env.PORT || 5000));
app.set('views', __dirname + '/views');
app.set('view engine', 'nunjucks');
app.use(function(req,res,next) {
	res.locals.session = req.session;
	req.fullUrl = req.protocol + '://' + req.get('host');
	req.db = mongoose;
	req.models = {
		User: User,
		Note: Note
	}
	next();
})
app.use(express.cookieParser('secret'));
app.use(express.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/', routes.index);
app.get('/oauth', routes.oauth);
app.get('/oauth_callback', routes.oauth_callback);
app.get('/clear', routes.clear);

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
