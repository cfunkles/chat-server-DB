//modules and GB variables
var express = require("express");
var app = express();
var expresSession = require('express-session');
var secret = require('./secret.js');
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var db;
//starts database then starts listening for requests.
mongodb.MongoClient.connect("mongodb://localhost", function(err, database) {
	if (err) {
		console.log(err);
		return;
	}
	console.log('Connected to database!');
	db = database;
	startListening();
});

//parses json data or urlencoded data recieved from front end
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(expresSession({
	//the secret is kept in the js file with the property of secret which is gitignored
	secret: secret.secret,
	resave: false,
	saveUninitialized: true
}));
//a function called when user logins in or registers to create a new session
function logIn(req, data) {
	req.session.user = {
		_id: data._id,
		username: data.username
	};
}
//middleware for loggin
app.post('/api/login', function(req, res) {
	db.collection('users').findOne({
		username: req.body.username,
		password: req.body.password
	}, function(err, data) {
		if (data === null) {
			res.send("error");
			return;
		}
		//the function call for a session, using params
		logIn(req, data);
		res.send("Logging in now...⏱");

	});
});
//register middleware
app.post('/api/register', function(req, res) {
	db.collection('users').findOne({
		//only searching for username
		username: req.body.username,
	}, function(err, data) {
		if (data === null) {
			//creates user only if it doesn't exist
			db.collection('users').insertOne({
				username: req.body.username,
				password: req.body.password
			}, function(err, data) {
				if (err) {
					console.log(err);
					res.status(500);
					res.send("error");
					return;
				}
			});
			//can't use data a param because it is null, just need to use req.body instead
			logIn(req, req.body);
			res.send('success');
		} else {
			//what to do if username exists
			res.send('The username ' + data.username + ' Already exists');
		}
	});
	
});
//get chats middleware, pretty typical
app.get('/api/chats', function(req, res) {
	if (!req.session.user) {
		res.status(403);
		res.send("forbidden");
		return;
	}
	db.collection('chats').find({}).toArray(function(err, chatsDoc) {
		if(err) {
			console.log(err);
			res.status(500);
			res.send("error");
			return;
		}
		res.send(chatsDoc);
	});
});
//new chat middleware, inserts message with name of user
app.post('/api/newChat', function(req, res) {
	if (!req.session.user) {
		res.status(403);
		res.send("forbidden");
		return;
	}
	db.collection('chats').insertOne({
		submitterName: req.session.user.username,
		message: req.body.message
	}, function(err, chatsDoc) {
		if (err) {
			console.log(err);
			res.status(500);
			res.send("error");
			return;
		}
		res.send("Chat posted!");
	});
});
//files for the main web address
app.use(express.static("public"));

//boilerplate error handling
app.use(function(req, res, next) {
	res.status(404);
	res.send('404 file not found!');
});
//boilerplate error handling
app.use(function(err, req, res , next) {
	console.log(err);
	res.status(500);
	res.send('500 internal server error');
	res.send(err);
});

//listening function to be called after connected to DB.
function startListening() {
	app.listen(8000, function() {
		console.log("server is started: http://localhost:8000 ⚡️");
	});
}

