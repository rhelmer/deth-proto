var express = require('express');
var errors = require('express-api-server').errors;
var jsonParser = require('body-parser').json();
var zonefile = require('dns-zonefile');
var fs = require('fs');

var router = module.exports = express.Router();

var ZONEFILE = './zones/zone.txt';

var zoneTxt = fs.readFileSync(ZONEFILE, 'utf8');
var zone = zonefile.parse(zoneTxt);

function modifyZone(oldZone, newZone) {
  // TODO validate input and modify zone based on input
  var newZone = oldZone;

  // save new zone file to disk
  var newRecordTxt = zonefile.generate(newZone);
  var newRecord = zonefile.parse(newRecordTxt);
  fs.readFileSync(ZONEFILE, newRecordTxt, 'utf8');

  // TODO reload DNS server
}

router.route('/deth/v1')
  .get(function(req, res, next) {
    res.json(zone);
  })
  .post(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    var newRecord = req.body;
    modifyZone(zone, newRecord);

    res.status(201);
    res.json(newRecord);
  })
  .delete(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    var removedRecord = req.body;
    modifyZone(zone, removedRecord);

    res.status(200);
    res.json(removedRecord);
  });
