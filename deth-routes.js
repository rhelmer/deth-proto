// todo-routes.js 
var express = require('express');
var errors = require('express-api-server').errors;
var jsonParser = require('body-parser').json();
 
var router = module.exports = express.Router();
 
router.route('/deth/v1')
  .get(function(req, res, next) {
    var records; // TODO get from backend
    res.json(records);
  })
  .post(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }
 
    // TODO validate
    var newRecord = filter(req.body);
 
    // TODO save to backend
 
    res.status(201);
    res.json(newRecord);
  })
  .delete(jsonParser, function(req, res, next) {
    if (!req.body) { return next(new errors.BadRequestError()); }

    // TODO validate
    var removedRecord = filter(req.body);

    // TODO save to backend

    res.status(200); // Created 
    res.json(removedRecord);
  });
