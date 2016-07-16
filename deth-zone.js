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
    * Removes a record from a zone.
    *
    * @param record - the full path to the record to remove.
    * @returns a json error or message with details on actions taken.
    */
  remove(record) {
    // TODO further validate input
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

    return {"message": `removed ${id} from ${rtype}`};
  }

  /**
    * Add a record to an existing zone.
    *
    * @param hostname - a string containing the host name to add.
    * @param changes - the object containing records to add in this zone.
    * @returns new zone object.
    */
  add(record, changes) {
    // TODO further validate input
    // should be compliant with http://hildjj.github.io/draft-deth/draft-hildebrand-deth.html#encoding-in-json
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

    if (rtype in this.cachedZone) {
      this.cachedZone[rtype].map(entry => {
        if (entry.name && entry.name == id) {
          throw Error("record already exists in zone");
        }
      });
    }

    let allowed_changes = {
      a:     {"ip": changes.v4address},
      aaaa:  {"ip": changes.v6address},
      cname: {"host": changes.cname},
      ns:    {"host": changes.ndsname},
      ptr:   {"host": changes.ptrdname},
      mx:    {"preference": changes.preference,
              "exchange": changes.exchange},
      srv:   {"priority": changes.priority,
              "weight": changes.weight,
              "target": changes.target},
      txt:   {"txt": changes.data}
    };

    let change = allowed_changes[rtype];

    // ensure that all required fields were provided
    for (let key in change) {
      if (change.hasOwnProperty(key)) {
        if (typeof change[key] == 'undefined') {
          return {"error": "invalid arguments for record type"};
        }
      }
    }

    change["name"] = id;
    if (this.cachedZone[rtype]) {
      this.cachedZone[rtype].push(change);
    } else {
      this.cachedZone[rtype] = [change];
    }

    // save new zone file to disk
    fs.writeFileSync(this.zoneFile, zonefile.generate(this.cachedZone), 'utf8');

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
