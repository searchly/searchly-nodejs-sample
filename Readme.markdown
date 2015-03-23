## Searchly Sample Node.js Application

This example illustrates basic search features of Searchly.

Sample application is using [Nodejs](https://github.com/elasticsearch/elasticsearch-js) Elasticsearch client to integrate with Searchly.

To create initial index and sample data click Create Sample Index & Data!

Type "John" or "Robert" to search box and hit enter for sample search results.

## Local Setup

To run example in your local environment with a local Elasticsearch instance, change connection string with local url string inside web.js

var connectionString = 'http://localhost:9200';

## PAAS Deployment

This sample can be deployed to Heroku, CloudControl, Pivotal, OpenShift and Modulus with no change.
