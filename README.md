Prototype for the DETH (DNS Editing Through HTTPS) spec:
https://github.com/hildjj/draft-deth

# Running
```
  $ npm start
```

This will start a DNS server and a DETH HTTP server listening on port 8000.

# Example usage

## Determining the DETH Server for a Zone

Normally this would be derived using a DNS query:
```
  $ dig +short TXT _deth.example.com
  https://example.com/deth/v1/
```

Since this is just a prototype, we can assume that the server is authoritative
for the `example.com` domain.

TODO come up with a better way to prototype realistic behavior locally.

## Getting All Records

Current records will be returned along with a list of edits the client
is authorized to perform.
```
  $ curl -X GET http://localhost:8000/deth/v1/
```
Might return:
```
  {
    "A": {
      "URI": "https://localhost:8000/deth/v1/A/",
      "methods": ["PUT", "DELETE"]
    },
    "AAAA": {
      "URI": "https://localhost:8000/deth/v1/AAAA/",
      "methods": ["PUT"]
    },
    "SRV": {
      "URI": "https://localhost:8000/deth/v1/example.com/SRV/",
      "methods": ["PUT", "DELETE"]
    },
    "TYPE255": {
      "URI": "https://localhost:8000/deth/v1/example.com/TYPE255/",
      "methods": ["PUT", "DELETE"]
    }
  }
```
TODO support GET on individual record types too.

## Creating Records

Given a document `change.json` describing the changes:
```
  {
    "RTYPE": "AAAA",
    "v6address": "::1",
    "TTL": 3600,
    "comment": "This is my home"
  }
```
If a TTL is not sent with the request, a system default will be used. The response from this PUT will be the JSON form of the record, as inserted. This response MUST have the TTL included.
```
  $ curl -H "Content-Type: application/json" -d @create.json -X POST http://localhost:8000/deth/v1/AAAA/www3
```

## Deleting Records
```
  $ curl -H "Content-Type: application/json" -X DELETE http://localhost:8000/deth/v1/AAAA/www3
```

## Updating Records

TODO, not specified yet.

# Return Codes and Errors

In general, errors use the approach from https://tools.ietf.org/html/draft-ietf-appsawg-http-problem-03
