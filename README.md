Prototype for the DETH (DNS Editing Through HTTPS) spec:
https://hildjj.github.io/draft-deth/draft-hildebrand-deth.html

[![Build Status](https://travis-ci.org/rhelmer/deth-proto.svg?branch=master)](https://travis-ci.org/rhelmer/deth-proto)

# Installing
```
  $ npm install
```

# Testing
```
  $ npm test
```

# Running
```
  $ npm start
```

This will start a DETH HTTP server listening on port 8000.

# Example usage

## Determining the DETH Server for a Zone

Normally this would be derived using a DNS query:
```
  $ dig +short TXT _deth.example.com
  https://example.com/deth/v1/
```

Since this is just a prototype, we can assume that the server is authoritative
for the `example.com` domain.

## Determining authorized edits

A list of edits the client is authorized to perform.
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

## Getting Records

TODO not specified yet:
http://hildjj.github.io/draft-deth/draft-hildebrand-deth.html#rfc.section.5.2

Individual record types can be queried:

```
  $ curl -H "Content-Type: application/json" localhost:8000/deth/v1/NS
```

Might return:

```
  [
    {
      "name": "@",
      "host": "NS1.EXAMPLE.COM."
    },
    {
      "name": "@",
      "host": "NS2.EXAMPLE.COM."
    }
  ]
```

## Creating Records

Given a document `create.json` describing the changes:
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

TODO not specified yet:
http://hildjj.github.io/draft-deth/draft-hildebrand-deth.html#rfc.section.5.5

# Return Codes and Errors

In general, errors use the approach from https://tools.ietf.org/html/draft-ietf-appsawg-http-problem-03

TODO move from `{"error":""}` JSON responses to https://tools.ietf.org/html/draft-ietf-appsawg-http-problem-03#section-3.1

