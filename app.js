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
    errorHandler = require('errorhandler'),
    fs = require('fs');

var connectionString = 'localhost:9200';

if (process.env.SEARCHBOX_URL) {
    // Heroku
    connectionString = process.env.SEARCHBOX_URL;
} else if (process.env.SEARCHLY_URL) {
    // CloudControl, Modulus
    connectionString = process.env.SEARCHLY_URL;
} else if (process.env.VCAP_SERVICES) {
    // Pivotal, Openshift
    connectionString = JSON.parse(process.env.VCAP_SERVICES)['searchly-n/a'][0]['credentials']['uri'];
}

console.info(connectionString);

var client = new elasticsearch.Client({
    host: connectionString,
    log: 'debug'
});

var _index = "company";
var _type = 'employee';

// configuration
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', function (req, res) {
    res.render('index', {"result": ""})
});

app.get('/index', function (req, res) {

    client.indices.delete({index: _index});

    client.indices.create({
        index: _index,
        body: {
            "settings": {
                "analysis": {
                    "filter": {
                        "autocomplete_filter": {
                            "type": "edge_ngram",
                            "min_gram": 1,
                            "max_gram": 10
                        }
                    },
                    "analyzer": {
                        "autocomplete": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": [
                                "lowercase",
                                "autocomplete_filter"
                            ]
                        }
                    }
                }
            },
            "mappings": {
                "employee": {
                    "properties": {
                        "city": {
                            "type": "text",
                            "fields": {
                                "raw": {"type": "keyword"}
                            }
                        },
                        "country": {
                            "type": "text",
                            "fields": {
                                "raw": {"type": "keyword"}
                            }
                        },
                        "first_name": {
                            "type": "text",
                            "fields": {
                                "autocomplete": {"type": "text", "analyzer": "autocomplete"}
                            }
                        },
                        "last_name": {
                            "type": "text"
                        },
                        "gender": {
                            "type": "keyword"
                        },
                        "job_title": {
                            "type": "text",
                            "fields": {
                                "raw": {"type": "keyword"}
                            }
                        },
                        "language": {
                            "type": "text",
                            "fields": {
                                "raw": {"type": "keyword"}
                            }
                        }
                    }
                }
            }
        }

    }, function (error, response) {

      if (error) throw error;

        fs.readFile('sample_data.json', 'utf8', function (err, data) {
            if (err) throw err;
            var sampleDataSet = JSON.parse(data);

            var body = [];

            sampleDataSet.forEach(function (item) {
                body.push({"index": {"_index": _index, "_type": _type}});
                body.push(item);
            });

            client.bulk({
                body: body
            }, function (err, resp) {
                res.render('index', {result: 'Indexing Completed!'});
            })
        });
    })
})
;

app.get('/autocomplete', function (req, res) {
    client.search({
        index: _index,
        type: _type,
        body: {
            "query": {
                    "multi_match": {
                        "query": req.query.term,
                        "fields": ["first_name.autocomplete"]
                    }
            }
        }
    }).then(function (resp) {

        var results = resp.hits.hits.map(function(hit){
            return hit._source.first_name + " " + hit._source.last_name;
        });

        res.send(results);
    }, function (err) {
        console.trace(err.message);
        res.send({response: err.message});
    });
});

app.get('/search', function (req, res) {

    var body = {
        "query": {
            "bool": {
                "must": {
                    "multi_match": {
                        "query": req.query.q,
                        "fields": ["first_name^100", "last_name^20", "country^5", "city^3", "language^10", "job_title^50"],
                        "fuzziness": 1
                    }
                }
            }
        },
        "aggs": {
            "country": {
                "terms": {
                    "field": "country.raw"
                }
            },
            "city": {
                "terms": {
                    "field": "city.raw"
                }
            },
            "language": {
                "terms": {
                    "field": "language.raw"
                }
            },
            "job_title": {
                "terms": {
                    "field": "job_title.raw"
                }
            },
            "gender": {
                "terms": {
                    "field": "gender"
                }
            }
        }
    }

    var aggValue = req.query.agg_value;
    var aggField = req.query.agg_field;
    if (aggField) {
      var filter = {};
      filter[aggField] = aggValue;
        body['query']['bool']['filter'] = { "term": filter}
    }

    client.search({
        index: _index,
        type: _type,
        body: body
    }).then(function (resp) {
        res.render('search', {response: resp, query: req.query.q});
    }, function (err) {
        console.trace(err.message);
        res.render('search', {response: err.message});
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
