# MMM-ResRobot

A module for MagicMirror2 (https://github.com/MichMich/MagicMirror) which shows scheduled departures from public transport stop(s) in Sweden. The module
uses the ResRobot API for which you do need to obtain an API key, see below.

# Install

1. Clone repository into `../modules/` inside your MagicMirror folder.
2. Run `npm install` inside `../modules/MMM-ResRobot/` folder
3. Find your Station ID at https://www.trafiklab.se/api/resrobot-reseplanerare/konsol. Select "Location Lookup" as Method and type your station name in "Location Name".
4. Add the module to the MagicMirror config
```
	{
		module: "MMM-ResRobot",
		position: "left",
		header: "Departures",
		config: {
			routes: [
				{from: "", to: ""},	// ResRobot Station IDs of starting and destination station(s). At least one route must be defined.
				{from: "", to: ""},	// "from" is required but "to" is optional (set "to" to empty string to indicate all destinations)
			],
			skipMinutes: 0,		// Skip departures that happens within the next <value> minutes.
			maximumEntries: 6,	// Number of departures to show on screen
			maximumDuration: 360,	// Number of minutes to search for departures
	                getRelative: 0,         // Show relative rather than absolute time when less than <valute> minutes left to departure, 0 = stay absolute
			truncateAfter: 5,	// A value > 0 will truncate direction name at first space after <value> characters. 0 = no truncation
			truncateLineAfter: 5,	// A value > 0 will truncate line number <value> characters. 0 = no truncation
	                showTrack: true,        // If true, track number will be displayed
			coloredIcons: false,    // Setting this to true will color transportation type icons according to colors in colorTable
			apiKey: ""		// Your ResRobot apiKey
        }
    },
```
# Get API key

You need to obtain your API key here: http://www.trafiklab.se, you want one for API "ResRobot v2.1". If you have a key for 2.0 you need to get a new one.
Registration is free but required.


# GTFS realtime-data

Kalles notes:
1. Skapa ett projekt
2. skapa api-keys för **Stops data**, **ResRobot v2.1** & **GTFS Regional Realtime**
3. Hitta stationsid för aktuell hållplats
  1. ladda ner _stops.xml för hela sverige [se här](https://www.trafiklab.se/api/netex-datasets/stops-data/)
  2. lättast i webläsaren: https://opendata.samtrafiken.se/stopsregister-netex-sweden/sweden.zip?key=<API key för Stops data>     - (wget gav 406)
    1. öppna i utforskaren / extrahera, så får du en _stops.xml-fil!
  3. Hitta de **local-stoppoint-gid** som tillhör vald hållplats (två st => en åt varje håll)
    1. lättast: kör regex med perl:
    2. `perl -0777 -ne 'while (/Gävle Domarringen(?:(?!<\/StopPlace>).)*?local-stoppoint-gid<\/Key>\n *<Value>\d*:(.*?)<\/Value>\n/sg) { print "hållplats: $1\n" }' data/_stops.xml`
      - hållplats: 9022021480123001 (bort från centrum)
      - hållplats: 9022021480123002 (mot Rådhuset/centrum)
4. hämta tidtabell med modifierad version av: [MMM-ResRobot](https://github.com/Alvinger/MMM-ResRobot)
5. hämta GTFS-Realtime data filtrera ut "departure" frånd de stopTimeUpdate-poster som har med aktuell stationen att göra. se [stopSequence.json](data/stopSequence.json)
```json
{
   "stopSequence": 17,
   "arrival": {
      "delay": 63,
      "time": "1728504843"
   },
   "departure": {
      "delay": 63,
      "time": "1728504843"
   },
   "stopId": "9022021480123002"
}
```
- jämför med ResRobots tider, time är epoch och redan omräknat med delay som är i sekunder!!!
- https://www.epochconverter.com/ för att konvertera och jämföra i xtrafik-appen
- time = 22:03:59 - delay 119s => tidtabell 22:02:00
1. sätt sedan delayet på rätt post i tabellen från ResRobot!
  - jag hoppas att det går att urskilja 3an och 12an på stopSequence om de har samma tid (vilket stopp i ordningen det är på turen)
    trean verkar ha 7 och 12an 17 om jag gissar rätt!


fick också den [här](https://github.com/staeco/gtfs-stream/blob/master/src/rt/index.js) streamren att funka manuellt om det behövs

