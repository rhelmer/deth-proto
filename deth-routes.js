"use strict";

let express = require('express');
let errors = require('express-api-server').errors;
let jsonParser = require('body-parser').json();
let dethZone = require('./deth-zone');

let router = module.exports = express.Router();

const ZONEFILE = './zones/zone.txt';
let zone = dethZone(ZONEFILE);

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
