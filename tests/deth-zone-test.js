"use strict";

let chai = require('chai');
let expect = chai.expect;
let dethZone = require('../deth-zone');

describe('DethZoneAdd', () => {
  let goodChanges = {
    "RTYPE": "AAAA",
    "v6address": "::2",
    "TTL": 3600,
    "comment": "This is my home",
  }

  it('.add() should throw if invalid URL arguments are sent', () => {
    // FIXME make it possible to mock this
    let zone = dethZone("./zones/zone.txt");

    expect(() => {
      zone.add("/lyfe/v1/AAAA/www2", goodChanges);
    }).to.throw('only deth protocol is supported');

    expect(() => {
      zone.add("/deth/v2/AAAA/www2", goodChanges);
    }).to.throw('only version v1 is supported');

    expect(() => {
      zone.add("/deth/v2/ABCD", goodChanges);
    }).to.throw('invalid URL');
  });

  it('.add() should return error if a bad document is sent in', () => {
    // FIXME make it possible to mock this
    let zone = dethZone("./zones/zone.txt");

    let result = JSON.stringify(zone.add("/deth/v1/AAAA/www2", badChanges));
    expect(result).to.equal('{"error":"invalid arguments for record type"}');
  });

  let badChanges = {
    "RTYPE": "ABCD",
    "v0address": "::2",
    "TTL": 3600,
    "comment": "This is my home",
  }

  it('.add() should return error if args do not match record type', () => {
    // FIXME make it possible to mock this
    let zone = dethZone("./zones/zone.txt");

    let result = JSON.stringify(zone.add("/deth/v1/AAAA/www2", badChanges));
    expect(result).to.equal('{"error":"invalid arguments for record type"}');
  });
});
