"use strict";

let express = require('express');
let errors = require('express-api-server').errors;
let jsonParser = require('body-parser').json();
let zonefile = require('dns-zonefile');
let fs = require('fs');

let router = module.exports = express.Router();

let ZONEFILE = './zones/zone.txt';

let zoneTxt = fs.readFileSync(ZONEFILE, 'utf8');
let zone = zonefile.parse(zoneTxt);

function modifyZone(oldZone, newZone) {
  // TODO validate input and modify zone based on input
  newZone = oldZone;

  // save new zone file to disk
  let newRecordTxt = zonefile.generate(newZone);
  let newRecord = zonefile.parse(newRecordTxt);
  fs.readFileSync(ZONEFILE, newRecordTxt, 'utf8');

  // TODO reload DNS server
}

router.route('/deth/v1')
  .get(function(req, res, next) {
    res.json(zone);
  })
  .post(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    let newRecord = req.body;
    modifyZone(zone, newRecord);

    res.status(201);
    res.json(newRecord);
  })
  .delete(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    let removedRecord = req.body;
    modifyZone(zone, removedRecord);

    res.status(200);
    res.json(removedRecord);
  });
