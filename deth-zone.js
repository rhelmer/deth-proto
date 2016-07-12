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

    for (let i = this.cachedZone[rtype].length - 1; i >= 0; i--) {
      console.log(this.cachedZone[rtype]);
      if (this.cachedZone[rtype][i] &&
          "name" in this.cachedZone[rtype][i] &&
          this.cachedZone[rtype][i]["name"] == id) {
        delete this.cachedZone[rtype][i];
      }
    }

    // save new zone file to disk
    fs.writeFileSync(this.zoneFile, zonefile.generate(this.cachedZone), 'utf8');

    // TODO reload DNS server
    return this.cachedZone;
  }

  /**
    * Modify a zone with new input, save to disk, and reload the DNS server.
    *
    * @param hostname - a string containing the host name to modify.
    * @param changes - the object containing records to modify in this zone.
    * @returns new zone object.
    */
  modify(hostname, changes) {
    // TODO further validate input
    // should be compliant with http://hildjj.github.io/draft-deth/draft-hildebrand-deth.html#encoding-in-json
    if (!("RTYPE" in changes)) {
      return {"error": "RTYPE must be specified"};
    }

    this.rtypes.map(type => {
      let newZone = Object.assign({}, this.cachedZone);
      if (type == 'A') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.ip = changes.v4address;
          }
        });
      } else if (type == 'AAAA') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.ip = changes.v6address;
          }
        });
      } else if (type == 'CNAME') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.host = changes.ndsname;
          }
        });
      } else if (type == 'NS') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.host = changes.ndsname;
          }
        });
      } else if (type == 'PTR') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.host = changes.ptrdname;
          }
        });
      } else if (type == 'MX') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.preference = changes.preference;
            entry.exchange = changes.exchange;
          }
        });
      } else if (type == 'SRV') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.priority = changes.priority;
            entry.weight = changes.weight;
            entry.target = changes.target;
          }
        });
      } else if (type == 'TXT') {
        newZone[type].map(entry => {
          if (entry.name && entry.name == hostname) {
            entry.data = changes.data;
          }
        });
      }
      this.cachedZone = newZone;
    });

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
    this.rtypes.map(type => {
      result[type] = {
        "URI": `http://localhost:8000/deth/v1/${type}`,
        "methods": ["PUT", "DELETE"]
      };
    });
    return result;
  }
}
