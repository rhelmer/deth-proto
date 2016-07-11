"use strict";

let zonefile = require('dns-zonefile');
let fs = require('fs');

// expose a regular function so callers don't need to handle new-style class.
module.exports = function create(opt) {
  return new Zone(opt);
}

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
    let output = {};

    this.rtypes.map(t => {
      if (t in this.cachedZone) {
        output[t] = this.cachedZone[t];
      }
    });

    return output;
  }
}
