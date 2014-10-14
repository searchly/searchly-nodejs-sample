/**
 * Module dependencies.
 */

var express = require('express'),
    elasticsearch = require('elasticsearch'),
    url = require('url'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    path = require('path'),
    logger = require('morgan'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    errorHandler = require('errorhandler');

var connectionString = 'https://site:your-key@xyz.searchly.com';

if (process.env.SEARCHBOX_URL) {
    // Heroku
    connectionString = process.env.SEARCHBOX_URL;
} else if (process.env.SEARCHBOX_URL) {
    // CloudControl, Modulus
    connectionString = process.env.SEARCHLY_URL;
} else if (process.env.VCAP_SERVICES) {
    // Pivotal, Openshift
    connectionString = JSON.parse(process.env.VCAP_SERVICES)['searchly-n/a'][0]['credentials']['uri'];
}

console.info(connectionString);

var client = new elasticsearch.Client({
    host: connectionString
});

var _index = "sample";
var _type = 'document';

// configuration
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', function (req, res) {
    res.render('index', {"result": ""})
});

app.get('/index', function (req, res) {
    client.indices.create({index: _index}, function (error, response) {
        client.bulk({
            body: [
                // action description
                { "index": { "_index": _index, "_type": _type, "_id": "1"} },
                {'name': 'Reliability', 'text': 'Reliability is improved if multiple redundant sites are used, ' +
                    'which makes well-designed cloud computing suitable for business continuity and disaster recovery. '},

                { "index": { "_index": _index, "_type": _type, "_id": "2"} },
                {'name': 'Virtualization', 'text': 'Virtualization technology allows servers and storage devices to be shared and utilization be increased. ' +
                    'Applications can be easily migrated from one physical server to another. '},
            ]
        }, function (err, resp) {
            res.render('index', {result: 'Indexing Completed!'});
        })
    })
});

app.get('/search', function (req, res) {
    client.search({
        index: _index,
        type: _type,
        body: {
            "query": {
                "multi_match": {
                    "query": req.query.q,
                    "fields": [ "name", "text" ]
                }
            }
        }
    }).then(function (resp) {
        var hits = resp.hits.hits;
        res.render('search', { result: hits});
    }, function (err) {
        console.trace(err.message);
        res.render('search', { result: err.message });
    });
});

app.get('/about', function (req, res) {
    res.render('about');
});

// error handling middleware should be loaded after the loading the routes
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
