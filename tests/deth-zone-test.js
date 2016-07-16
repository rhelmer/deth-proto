"use strict";

let chai = require('chai');
let expect = chai.expect;
let dethZone = require('../deth-zone');
let mock = require('mock-fs');
let fs = require('fs');
let zonefile = require('dns-zonefile');

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
mail IN MX 10 mail.example.com.

; A Records
www1	IN	A	127.0.0.1
www2	IN	A	127.0.0.1

; AAAA Records
www3	IN	AAAA	::1
www4	IN	AAAA	::1

; CNAME Records
www5  CNAME www1

; PTR Records
1	IN	PTR	HOST1.EXAMPLE.COM.
2	IN	PTR	HOST2.EXAMPLE.COM.

; TXT Records
text IN TXT "test123"

; SRV Records
serv1 86400 IN SRV 10 60 9080 serv2.example.com.

; SPF Records

; TYPE255
type1 IN TYPE255 "test123"
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

  it('should throw if args record type is incorrect', () => {
    expect(() => {
      zone.add("/deth/v1/ABCD/www2", goodChanges);
    }).to.throw('invalid record type');
  });

  it('should throw if args rtype does not match document rtype', () => {
    let result = JSON.stringify(zone.add("/deth/v1/AAAA/www2", badChanges));
    expect(result).to.equal('{"error":"invalid arguments for record type"}');
  });

  it('should allow adding A records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'A';
    delete changes.v6address;
    changes["v4address"] = '127.0.0.1';
    let result = JSON.stringify(zone.add("/deth/v1/A/www5", changes));
    expect(result).to.equal(
      '{"RTYPE":"A","TTL":3600,"comment":"This is my home","v4address":"127.0.0.1"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).includes({ name: 'www5', ip: '127.0.0.1' });
  });

  it('should allow adding AAAA records', () => {
    let result = JSON.stringify(zone.add("/deth/v1/AAAA/www5", goodChanges));
    expect(result).to.equal(
      '{"RTYPE":"AAAA","v6address":"::2","TTL":3600,"comment":"This is my home"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['aaaa']).includes({ name: 'www5', ip: '::2' });
  });

  it('should allow adding CNAME records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'CNAME';
    delete changes.v6address;
    changes["cname"] = 'www1';
    let result = JSON.stringify(zone.add("/deth/v1/CNAME/www6", changes));
    expect(result).to.equal(
      '{"RTYPE":"CNAME","TTL":3600,"comment":"This is my home","cname":"www1"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['cname']).includes({ name: 'www5', alias: 'www1' });
  });

  it('should allow adding NS records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'NS';
    delete changes.v6address;
    changes["ndsname"] = 'ns3.example.com';
    let result = JSON.stringify(zone.add("/deth/v1/NS/ns3", changes));
    expect(result).to.equal(
      '{"RTYPE":"NS","TTL":3600,"comment":"This is my home","ndsname":"ns3.example.com"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['ns']).includes({ name: 'ns3', host: 'ns3.example.com' });
  });

  it('should allow adding PTR records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'PTR';
    delete changes.v6address;
    changes["ptrdname"] = '1.0.0.127.in-addr.arpa';
    let result = JSON.stringify(zone.add("/deth/v1/PTR/www1", changes));
    expect(result).to.equal(
      '{"RTYPE":"PTR","TTL":3600,"comment":"This is my home","ptrdname":"1.0.0.127.in-addr.arpa"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['ptr']).includes(
      { name: 'www1',
        fullname: 'www1.0.168.192.IN-ADDR.ARPA.',
        host: '1.0.0.127.in-addr.arpa'
      }
    );
  });

  it('should allow adding MX records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'MX';
    delete changes.v6address;
    changes["preference"] = '0';
    changes["exchange"] = 'mail.example.com';
    let result = JSON.stringify(zone.add("/deth/v1/MX/mail2", changes));
    expect(result).to.equal(
      '{"RTYPE":"MX","TTL":3600,"comment":"This is my home","preference":"0","exchange":"mail.example.com"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['mx']).includes(
      { name: 'mail2', preference: 0, host: 'mail.example.com' }
    );
  });

  it('should allow adding SRV records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'SRV';
    delete changes.v6address;
    changes["priority"] = '0';
    changes["weight"] = '10';
    changes["target"] = 'serv3';
    let result = JSON.stringify(zone.add("/deth/v1/SRV/serv2", changes));
    expect(result).to.equal(
      '{"RTYPE":"SRV","TTL":3600,"comment":"This is my home","priority":"0","weight":"10","target":"serv3"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['srv']).includes(
      { name: 'serv2',
       target: 'serv3',
       priority: 0,
       weight: 10,
       port: 0,
     }
    );
  });

  it('should allow adding TXT records', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'TXT';
    delete changes.v6address;
    changes["data"] = 'test123';
    let result = JSON.stringify(zone.add("/deth/v1/TXT/www1", changes));
    expect(result).to.equal(
      '{"RTYPE":"TXT","TTL":3600,"comment":"This is my home","data":"test123"}'
    );

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['txt']).includes({ name: 'www1', txt: '"test123"' });
  });

  it('should allow unknown record types', () => {
    let changes = Object.assign({}, goodChanges);
    changes.RTYPE = 'TYPE255';
    delete changes.v6address;
    changes["RDATA"] = 'test123';
    let result = JSON.stringify(zone.add("/deth/v1/TYPE255/www1", changes));
    expect(result).to.equal(
      '{"RTYPE":"TYPE255","TTL":3600,"comment":"This is my home","RDATA":"test123"}'
    );

    /* FIXME `dns-zonefile` does not yet support unknown record types
    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);
    expect(cachedZone['type255']).includes({ rdata: '"test123"' });
    */
  });
});

describe('DethZoneRemove', () => {

  let zone;

  beforeEach(() => {
    // mock `fs` module
    mock();
    fs.mkdir('./zones');
    fs.writeFileSync(zoneFile, zoneContents);

    zone = dethZone(zoneFile);
  });

  afterEach(mock.restore);

  it('should throw if invalid URL arguments are sent', () => {
    expect(() => {
      zone.remove("/lyfe/v1/AAAA/www2");
    }).to.throw('only deth protocol is supported');

    expect(() => {
      zone.remove("/deth/v2/AAAA/www2");
    }).to.throw('only version v1 is supported');

    expect(() => {
      zone.remove("/deth/v2/ABCD");
    }).to.throw('invalid URL');
  });

  it('should return an error trying to remove a non-existent record', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/A/www5"));
    expect(result).to.equal('{"error":"no matching records found in zone"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'www5', ip: '127.0.0.1' });
  });

  it('should allow removing A records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/A/www1"));
    expect(result).to.equal('{"message":"removed www1 from a"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'www1', ip: '127.0.0.1' });
  });

  it('should allow removing AAAA records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/AAAA/www3"));
    expect(result).to.equal('{"message":"removed www3 from aaaa"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'www3', ip: '::1' });
  });


  it('should allow removing CNAME records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/CNAME/www5"));
    expect(result).to.equal('{"message":"removed www5 from cname"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'www5', alias: 'www1' });
  });

  it('should allow removing NS records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/NS/@"));
    expect(result).to.equal('{"message":"removed @ from ns"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'www5', alias: 'www1' });
  });

  it('should allow removing PTR records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/PTR/1"));
    expect(result).to.equal('{"message":"removed 1 from ptr"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'www5', alias: 'www1' });
  });

  it('should allow removing MX records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/MX/mail"));
    expect(result).to.equal('{"message":"removed mail from mx"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'mail', preference: 10, host: 'mail' });
  });

  it('should allow removing SRV records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/SRV/serv1"));
    expect(result).to.equal('{"message":"removed serv1 from srv"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'mail', preference: 10, host: 'mail' });
  });

  it('should allow removing TXT records', () => {
    let result = JSON.stringify(zone.remove("/deth/v1/TXT/text"));
    expect(result).to.equal('{"message":"removed text from txt"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'text', txt: '"test123"' });
  });

  it('should allow removing unknown records', () => {
    /* FIXME `dns-zonefile` cannot handle these yet
    let result = JSON.stringify(zone.remove("/deth/v1/TYPE255/test123"));
    expect(result).to.equal('{"message":"removed test123 from type255"}');

    let zoneTxt = fs.readFileSync(zoneFile, 'utf8');
    let cachedZone = zonefile.parse(zoneTxt);

    expect(cachedZone['a']).not.includes({ name: 'test123', rdata: '"test123"' });
    */
  });

});
