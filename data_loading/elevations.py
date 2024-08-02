import googlemaps
import json
import itertools

with open("secrets.json") as f:
    secrets = json.load(f)

API_KEY = secrets["API_KEY"]
LOCATION_FILE = "data/sidewalk_locations.json"
FULL_OUTPUT_FILE = "data/sidewalk_elevations_full_output.json"
USABLE_OUTPUT_FILE = "data/sidewalk_elevations_30.json"

with open(LOCATION_FILE) as f:
    locations = json.load(f)
    
gmaps = googlemaps.Client(key=API_KEY)

elevations = []
for chunk in itertools.batched(locations, 512):
    elevations += gmaps.elevation(list(chunk))

with open(FULL_OUTPUT_FILE, mode="w", encoding="utf-8") as f:
    json.dump(elevations, f)
    
with open(USABLE_OUTPUT_FILE, mode="w", encoding="utf-8") as f:
    json.dump([e['elevation'] for e in elevations], f)