import urllib.request, json
data = json.dumps({"id": "006A0DAE3B3FFFEAE827", "walkable": True, "height": 0}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/buildings/override', method='POST', data=data, headers={'Content-Type': 'application/json'})
print(urllib.request.urlopen(req).read())
