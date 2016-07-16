"use strict";

let chai = require('chai');
let expect = chai.expect;
let dethZone = require('../deth-zone');

describe('DethZoneAdd', () => {
  it('.add() should throw if invalid URL arguments are sent', () => {
    let changes = {
      "RTYPE": "AAAA",
      "v6address": "::2",
      "TTL": 3600,
      "comment": "This is my home",
    }
    // FIXME make it possible to mock this
    let zone = dethZone("./zones/zone.txt");

    let badUrl = "/deth/v2/AAAA/www2";

    expect(() => {
      zone.add(badUrl, changes);
    }).to.throw('only version v1 is supported');
  });
});
