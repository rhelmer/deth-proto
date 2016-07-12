"use strict";

let zonefile = require('dns-zonefile');
let fs = require('fs');

// expose a regular function so callers don't need to handle new-style class.
module.exports = function create(opt) {
  return new Zone(opt);
}

/**
  * A Zone object represents a DNS zone.
  * It provides methods to modify the records in a zone, and to generateOutput
  * an object which can be serialized to spec-compliant DETH JSON.
  */
class Zone {
  constructor(zoneFile) {
    this.zoneFile = zoneFile;
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
    /* FIXME return a valid result object:
       {
        "A": {
          "URI": "https://example.com/deth/v1/A/",
          "methods": ["PUT", "DELETE"]
        },
        "AAAA": {
          "URI": "https://example.com/deth/v1/AAAA/",
          "methods": ["PUT"]
        },
        "SRV": {
          "URI": "https://example.com/deth/v1/example.com/SRV/",
          "methods": ["PUT", "DELETE"]
        },
        "TYPE255": {
          "URI": "https://example.com/deth/v1/example.com/TYPE255/",
          "methods": ["PUT", "DELETE"]
        }
      }

    */
    let output = {};

    this.rtypes.map(type => {
      if (type in this.cachedZone) {
        output[type] = this.cachedZone[type];
      }
    });

    return output;
  }
}
