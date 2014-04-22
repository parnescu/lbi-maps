var express = require('express'),
	path = require('path'),
	app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../bower_components')));


app.get('/', function(req, res){ res.render('layout')});
app.listen(app.get('port'));
console.log("SERVER:: init");

//script(type="text/javascript", src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDH7RbFI8ACYlpwstqDyq7JvRZjE1w1kBg&sensor=false")