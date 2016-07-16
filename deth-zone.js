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
    this.rtypes = ['ns', 'a', 'aaaa', 'cname', 'ns', 'ptr', 'mx', 'srv', 'txt'];
    // FIXME tighten up unknown RTYPE regex
    this.unknown_rtype = /[A-Za-z].*\d.*/;
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
    let args = this._parseUrl(record.split('/'));

    let rtype = args["rtype"];
    let hostname = args["hostname"];

    if (Object.keys(this.cachedZone).indexOf(rtype) == -1 ||
        this.cachedZone[rtype].length == 0) {
      return {"error": "no record types in zone"};
    }

    let changed = false;
    for (let i = this.cachedZone[rtype].length - 1; i >= 0; i--) {
      if (this.cachedZone[rtype][i] &&
          "name" in this.cachedZone[rtype][i] &&
          this.cachedZone[rtype][i]["name"] == hostname) {
        delete this.cachedZone[rtype][i];
        changed = true;
      }
    }

    if (!changed) {
      return {"error": "no matching records found in zone"};
    }

    // save new zone file to disk
    fs.writeFileSync(this.zoneFile, zonefile.generate(this.cachedZone), 'utf8');

    return {"message": `removed ${hostname} from ${rtype}`};
  }

  /**
    * Add a record to an existing zone.
    *
    * @param hostname - a string containing the host name to add.
    * @param changes - the object containing records to add in this zone.
    * @returns new zone object.
    */
  add(record, changes) {
    let args = this._parseUrl(record.split('/'));

    let rtype = args["rtype"];
    let hostname = args["hostname"];

    this._validateChanges(changes, rtype)

    // optional TTL
    let ttl = 3600;
    if ("TTL" in changes) {
      // TODO validate that this is a uint
      ttl = changes["TTL"];
    }

    // optional comment
    let comment;
    if ("comment" in changes) {
      comment = changes["comment"];
    }

    if (rtype in this.cachedZone) {
      this.cachedZone[rtype].map(entry => {
        if (entry.name && entry.name == hostname) {
          throw Error("record already exists in zone");
        }
      });
    }

    let allowed_changes = {
      a:     {"ip":         changes.v4address},
      aaaa:  {"ip":         changes.v6address},
      cname: {"alias":      changes.cname},
      ns:    {"host":       changes.ndsname},
      ptr:   {"host":       changes.ptrdname},
      mx:    {"preference": changes.preference,
              "host":       changes.exchange},
      srv:   {"priority":   changes.priority,
              "weight":     changes.weight,
              "target":     changes.target,
              // FIXME add to spec?
              "port":       "0"},
      txt:   {"txt":        changes.data}
    }

    let change = {};

    // handle unknown record types
    // see https://tools.ietf.org/html/rfc3597
    // FIXME `dns-zonefile` doesn't support these, yet
    if (this.unknown_rtype.test(rtype)) {
      if (!"RDATA" in changes) {
        return {"error": "invalid arguments for new record type"};
      } else {
        change = {"rdata": changes.RDATA};
      }
    } else {
      change = allowed_changes[rtype];
    }

    // ensure that all required fields were provided
    for (let key in change) {
      if (change.hasOwnProperty(key)) {
        if (typeof change[key] == 'undefined') {
          return {"error": "invalid arguments for record type"};
        }
      }
    }

    change["name"] = hostname;
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
    * Handle requests to display data about a particular record type.
    * @param record - the HTTP REST-style arguments.
    * @returns JSON representation of record
    *
    * FIXME - output is not specified yet.
    */
  get(record) {
    let args = record.split('/');

    if (args.length != 4) {
      return {"error": "invalid URL"};
    }

    let rtype = args[3].toLowerCase();

    if (!rtype) {
      return this.authorizedEdits;
    }

    if (this.rtypes.indexOf(rtype) == -1) {
      return {"error": "invalid record type"};
    }

    if (rtype in this.cachedZone) {
      console.log("rhelmer debug", this.cachedZone);
      return this.cachedZone[rtype];
    } else {
      return {"error": "no record types found in zone"};
    }
  }

  /**
    * Generate an object describing the edits that this client is authorized
    * to perform.
    *
    * @returns spec-compliant output object, suitable for returning to client
    *          as JSON.
    *
    * FIXME needs auth system to do something useful.
    * TODO add support for unknown record types.
    */
  get authorizedEdits() {
    let result = {};
    this.rtypes.map(rtype => {
      let RTYPE = rtype.toUpperCase();
      result[RTYPE] = {
        "URI": `http://localhost:8000/deth/v1/${RTYPE}/`,
        "methods": ["GET", "PUT", "DELETE"]
      };
    });
    return result;
  }

  /**
   * Validate incoming url and generate result object.
   *
   * @param args - Array containing REST-style URL arguments.
   * @returns object - contains validated REST-style URL arguments.
   * @throws Error if URL is invalid.
   */
  _parseUrl(args) {
    if (args.length != 5) {
      throw Error("invalid URL");
    }

    let proto = args[1];
    if (proto != 'deth') {
      throw Error("only deth protocol is supported");
    }

    let version = args[2];
    if (version != 'v1') {
      throw Error("only version v1 is supported");
    }

    let rtype = args[3].toLowerCase();
    if (this.rtypes.indexOf(rtype) == -1 &&
        !this.unknown_rtype.test(rtype)) {
      throw Error("invalid record type");
    }

    // see rfc1035 section 2.3.4 Size limits
    let max_hostname_length = 63;
    let hostname = args[4];
    if (hostname.length > max_hostname_length) {
      throw Error("hostname too long");
    }

    let result = {
      "proto": proto,
      "version": version,
      "rtype": rtype,
      "hostname": hostname,
    }

    return result;
  }
  /**
   * Validate incoming change document.
   *
   * @param changeDocument - original JSON document.
   * @returns bool - true if valid.
   * @throws Error if document is invalid.
   * @see http://hildjj.github.io/draft-deth/draft-hildebrand-deth.html#encoding-in-json
   */
  _validateChanges(changeDocument, rtype) {
    if (!"RTYPE" in changeDocument) {
      return {"error": "RTYPE must be specified"};
    }

    if (changeDocument.RTYPE.toLowerCase() != rtype) {
      return {"error": "RTYPE in document must match rtype in URL"}
    }

    return true;
  }
}
