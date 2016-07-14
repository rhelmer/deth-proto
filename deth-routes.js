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
    let output = zone.authorizedEdits;
    res.json(output);
  })
  .post(jsonParser, function(req, res, next) {
    if (!req.body) {
      return next(new errors.BadRequestError());
    }

    let record = req.path;
    let changes = req.body;
    try {
      let output = zone.add(record, changes);
      res.status(201);
      res.json(output);
    } catch (e) {
      let output = {"error": e.message};
      res.status(500);
      res.json(output);
    }
  })
  .delete(jsonParser, function(req, res, next) {
    if (!req.body) {
      return next(new errors.BadRequestError());
    }

    let record = req.path;
    let output = zone.delete(record);

    res.status(200);
    res.json(output);
  });
