"use strict";

let express = require('express');
let errors = require('express-api-server').errors;
let jsonParser = require('body-parser').json();
let zonefile = require('dns-zonefile');
let fs = require('fs');

let router = module.exports = express.Router();

class Zone {
  constructor() {
    this.zoneFile = './zones/zone.txt';
    this.rtypes = ['ns', 'a', 'aaaa', 'srv', 'txt'];

    let zoneTxt = fs.readFileSync(this.zoneFile, 'utf8');
    this.cachedZone = zonefile.parse(zoneTxt);
  }
  /**
    * Modify a zone with new input, save to disk, and reload the DNS server.
    *
    * @param newZone - the new zone object to merge into the original.
    * @returns new zone object.
    */
  modify(newZone) {
    // empty objects aren't useful.
    if (Object.getOwnPropertyNames(newZone).length == 0) {
      return this.cachedZone;
    }

    // save new zone file to disk
    let newRecordTxt = zonefile.generate(newZone);
    let newRecord = zonefile.parse(newRecordTxt);
    fs.writeFileSync(this.zoneFile, newRecordTxt, 'utf8');

    // re-load cache
    zoneTxt = fs.readFileSync(this.zoneFile, 'utf8');
    this.cachedZone = zonefile.parse(zoneTxt);

    // TODO reload DNS server
    return newZone;
  }

  /**
    * Generate a spec-compliant output object from a full zone object.
    *
    * @returns spec-compliant output object, suitable for returning to client
    *          as JSON.
    */
  get generateOutput() {
    let output = {};

    this.rtypes.map(t => {
      if (t in this.cachedZone) {
        output[t] = this.cachedZone[t];
      }
    });

    return output;
  }
}

let zone = new Zone();

router.route('/deth/v1/*')
  .get(function(req, res, next) {
    let output = zone.generateOutput;
    res.json(output);
  })
  .post(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    let newRecord = req.body;
    zone.modify(newRecord);

    res.status(201);
    res.json(zone.generateOutput);
  })
  .delete(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    let removedRecord = req.body;
    zone.modify(removedRecord);

    res.status(200);
    res.json(zone.generateOutput);
  });
