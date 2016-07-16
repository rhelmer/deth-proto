"use strict";

let chai = require('chai');
let expect = chai.expect;
let dethZone = require('../deth-zone');
let mock = require('mock-fs');
let fs = require('fs');

const zoneFile = './zones/test-zone.txt';
const zoneContents = `
; Zone: 0.168.192.IN-ADDR.ARPA.
; Exported  (yyyy-mm-ddThh:mm:ss.sssZ): 2016-07-16T05:25:08.300Z

$ORIGIN 0.168.192.IN-ADDR.ARPA.
$TTL 3600

; SOA Record
@	 		IN	SOA	NS1.EXAMPLE.COM.	HOSTMASTER.EXAMPLE.COM.	(
1411420237	 ;serial
3600	 ;refresh
600	 ;retry
604800	 ;expire
86400	 ;minimum ttl
)

; NS Records
@	IN	NS	NS1.EXAMPLE.COM.
@	IN	NS	NS2.EXAMPLE.COM.

; MX Records

; A Records
www1	IN	A	127.0.0.1
www2	IN	A	127.0.0.1

; AAAA Records
www3	IN	AAAA	::1
www4	IN	AAAA	::1

; CNAME Records

; PTR Records
1	IN	PTR	HOST1.EXAMPLE.COM.
2	IN	PTR	HOST2.EXAMPLE.COM.

; TXT Records

; SRV Records

; SPF Records
`;

describe('DethZoneAdd', () => {

  let zone;

  beforeEach(() => {
    // mock `fs` module
    mock();
    fs.mkdir('./zones');
    fs.writeFileSync(zoneFile, zoneContents);

    zone = dethZone(zoneFile);
  });

  afterEach(mock.restore);

  let goodChanges = {
    "RTYPE": "AAAA",
    "v6address": "::2",
    "TTL": 3600,
    "comment": "This is my home",
  }

  it('should throw if invalid URL arguments are sent', () => {
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

  it('should return error if a bad document is sent in', () => {
    let result = JSON.stringify(zone.add("/deth/v1/AAAA/www2", badChanges));
    expect(result).to.equal('{"error":"invalid arguments for record type"}');
  });

  let badChanges = {
    "RTYPE": "ABCD",
    "v0address": "::2",
    "TTL": 3600,
    "comment": "This is my home",
  }

  it('should return error if args do not match record type', () => {
    let result = JSON.stringify(zone.add("/deth/v1/AAAA/www2", badChanges));
    expect(result).to.equal('{"error":"invalid arguments for record type"}');
  });

  it('should return error args rtype does not match document rtype', () => {
    expect(() => {
      zone.add("/deth/v1/ABCD/www2", goodChanges);
    }).to.throw('invalid record type');
  });
});
