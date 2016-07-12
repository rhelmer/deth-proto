"use strict";

let zonefile = require('dns-zonefile');
let fs = require('fs');

// expose a regular function so callers don't need to handle new-style class.
module.exports = function create(opt) {
  return new Zone(opt);
}

/**
  * A Zone object represents a DNS zone.
  * It provides methods to modify the records in a zone, and to generate
  * an object which can be serialized to spec-compliant DETH JSON.
  */
class Zone {
  constructor(zoneFile) {
    this.zoneFile = zoneFile;
    // TODO add support for rrtype_update, see https://tools.ietf.org/html/rfc3597
    this.rtypes = ['ns', 'a', 'aaaa', 'cname', 'ns', 'ptr', 'mx', 'srv', 'txt'];
    let zoneTxt = fs.readFileSync(this.zoneFile, 'utf8');
    this.cachedZone = zonefile.parse(zoneTxt);
  }

  /**
    * Deletes a record from a zone.
    *
    * @param record - the full path to the record to remove.
    * @returns a json error or message with details on actions taken.
    */

  delete(record) {
    // FIXME use a nicer parser, if destrucuring is not an option
    let split = record.split('/');
    let proto = split[1];
    let version = split[2];
    let rtype = split[3].toLowerCase();
    let id = split[4];

    if (this.rtypes.indexOf(rtype) == -1) {
      return {"error": "invalid record type"};
    }

    if (Object.keys(this.cachedZone).indexOf(rtype) == -1 ||
        this.cachedZone[rtype].length == 0) {
      return {"error": "no record types in zone"};
    }

    let changed = false;
    for (let i = this.cachedZone[rtype].length - 1; i >= 0; i--) {
      if (this.cachedZone[rtype][i] &&
          "name" in this.cachedZone[rtype][i] &&
          this.cachedZone[rtype][i]["name"] == id) {
        delete this.cachedZone[rtype][i];
        changed = true;
      }
    }

    if (!changed) {
      return {"error": "no matching records found in zone"};
    }

    // save new zone file to disk
    fs.writeFileSync(this.zoneFile, zonefile.generate(this.cachedZone), 'utf8');

    // TODO reload DNS server
    return {"message": `deleted ${id} from ${rtype}`};
  }

  /**
    * Modify a zone with new input, save to disk, and reload the DNS server.
    *
    * @param hostname - a string containing the host name to modify.
    * @param changes - the object containing records to modify in this zone.
    * @returns new zone object.
    */
  modify(record, changes) {
    // TODO further validate input
    // should be compliant with http://hildjj.github.io/draft-deth/draft-hildebrand-deth.html#encoding-in-json
    // FIXME use a nicer parser, if destrucuring is not an option
    let split = record.split('/');
    let proto = split[1];
    let version = split[2];
    let rtype = split[3].toLowerCase();
    let id = split[4];

    if (!("RTYPE" in changes)) {
      return {"error": "RTYPE must be specified"};
    }

    if (this.rtypes.indexOf(rtype) == -1) {
      return {"error": "invalid record type"};
    }

    if (Object.keys(this.cachedZone).indexOf(rtype) == -1 ||
        this.cachedZone[rtype].length == 0) {
      return {"error": "no record types in zone"};
    }

    let changed = false;
    this.cachedZone[rtype].map(entry => {
      if (rtype == 'a') {
        if (entry.name && entry.name == id) {
          entry.ip = changes.v4address;
          changed = true;
        }
      } else if (rtype == 'aaaa') {
        if (entry.name && entry.name == id) {
          entry.ip = changes.v6address;
          changed = true;
        }
      } else if (rtype == 'cname') {
        if (entry.name && entry.name == id) {
          entry.host = changes.ndsname;
          changed = true;
        }
      } else if (rtype == 'ns') {
        if (entry.name && entry.name == id) {
          entry.host = changes.ndsname;
          changed = true;
        }
      } else if (rtype == 'ptr') {
        if (entry.name && entry.name == id) {
          entry.host = changes.ptrdname;
          changed = true;
        }
      } else if (rtype == 'mx') {
        if (entry.name && entry.name == id) {
          entry.preference = changes.preference;
          entry.exchange = changes.exchange;
          changed = true;
        }
      } else if (rtype == 'srv') {
        if (entry.name && entry.name == id) {
          entry.priority = changes.priority;
          entry.weight = changes.weight;
          entry.target = changes.target;
          changed = true;
        }
      } else if (rtype == 'txt') {
        if (entry.name && entry.name == id) {
          entry.data = changes.data;
          changed = true;
        }
      }
    });

    if (!changed) {
      return {"error": "no matching records found"};
    }

    // save new zone file to disk
    fs.writeFileSync(this.zoneFile, zonefile.generate(this.cachedZone), 'utf8');

    // TODO reload DNS server
    return changes;
  }

  /**
    * Generate an object describing the edits that this client is authorized
    * to perform.
    *
    * @returns spec-compliant output object, suitable for returning to client
    *          as JSON.
    *
    * FIXME needs auth system to do something useful.
    */
  get authorizedEdits() {
    let result = {};
    this.rtypes.map(rtype => {
      result[rtype] = {
        "URI": `http://localhost:8000/deth/v1/${rtype}`,
        "methods": ["PUT", "DELETE"]
      };
    });
    return result;
  }
}
