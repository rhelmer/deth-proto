"use strict";

const ZONEFILE = './zones/zone.txt';
const RTYPES = ['ns', 'aa', 'aaaa', 'srv', 'txt'];

let express = require('express');
let errors = require('express-api-server').errors;
let jsonParser = require('body-parser').json();
let zonefile = require('dns-zonefile');
let fs = require('fs');

let router = module.exports = express.Router();

// cached zone data, TODO maybe put this in a function
let zoneTxt = fs.readFileSync(ZONEFILE, 'utf8');
let cachedZone = zonefile.parse(zoneTxt);

/**
  * Generate a spec-compliant output object from a full zone object.
  *
  * @param zone - full zone object.
  * @returns spec-compliant output object, suitable for returning to client
  *          as JSON.
  */
function generateOutput(zone) {
  let output = {};

  RTYPES.map(t => {
    if (t in cachedZone) {
      output[t] = cachedZone[t];
    }
  });

  return output;
}

/**
  * Modify a zone with new input, save to disk, and reload the DNS server.
  *
  * @param oldZone - the original zone object.
  * @param newZone - the new zone object to merge into the original.
  * @returns new zone object.
  */
function modifyZone(oldZone, newZone) {
  // TODO validate input and modify zone based on input
  newZone = oldZone;

  // save new zone file to disk
  let newRecordTxt = zonefile.generate(newZone);
  let newRecord = zonefile.parse(newRecordTxt);
  fs.writeFileSync(ZONEFILE, newRecordTxt, 'utf8');

  // re-load cache
  zoneTxt = fs.readFileSync(ZONEFILE, 'utf8');
  cachedZone = zonefile.parse(zoneTxt);

  // TODO reload DNS server
  return newZone;
}

router.route('/deth/v1/*')
  .get(function(req, res, next) {
    let output = generateOutput(cachedZone);
    res.json(output);
  })
  .post(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    let newRecord = req.body;
    let result = modifyZone(cachedZone, newRecord);
    let output = generateOutput(result);

    res.status(201);
    res.json(output);
  })
  .delete(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    let removedRecord = req.body;
    let result = modifyZone(cachedZone, removedRecord);
    let output = generateOutput(result);

    res.status(200);
    res.json(output);
  });
