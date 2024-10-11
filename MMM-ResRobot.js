/* Resrobot - Timetable for ResRobot Module */

/* Magic Mirror
 * Module: MMM-ResRobot
 *
 * By Johan Alvinger https://github.com/Alvinger
 * based on a script by Benjamin Angst http://www.beny.ch which is
 * based on a script from Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("MMM-ResRobot", {

	// Define module defaults
	defaults: {
		updateInterval: 1 * 60 * 1000,	// Update module every minute.
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25,	// Start on 1/4th of the list.
		ResRobot: {
			apiBase: "https://api.resrobot.se/v2.1/departureBoard?format=json&passlist=0",
			apiKey: "<YOUR RESROBOT API KEY HERE>",
			directionFlag: "2"
		},
		GTFSRegionalRealtime: {
			apiKey: "<YOUR GTFS-Regional-Realtime API KEY HERE>",
			operator: 'xt',
			stopId: '9022021480123002',
			baseUrl: "https://opendata.samtrafiken.se/gtfs-rt/",
			updateFreq: {
				morning: {start: 6, end: 10, frequency: 60},    // 06:00–10:00
				midday: {start: 10, end: 15, frequency: 120},    // 10:00–15:00
				afternoon: {start: 15, end: 20, frequency: 60},  // 15:00–20:00
				evening: {start: 20, end: 23, frequency: 120},   // 20:00–23:00
				night: {start: 23, end: 6, frequency: 300},      // 23:00–06:00
			}
		},
		routes: [
			{from: "740020749", to: ""},	// Each route has a starting station ID from ResRobot, default: Stockholm Central Station (Metro)
		],					// and a destination station ID from ResRobot, default: none
		skipMinutes: 0,		// Skip entries that depart with the next <value> minutes
		maximumEntries: 6,	// Maximum number of departures to display
		maximumDuration: 360,	// Maximum number of minutes to search for departures
		truncateAfter: 5,	// A value > 0 will truncate direction name at first space after <value> characters. 0 = no truncation
		truncateLineAfter: 5,	// A value > 0 will truncate the line number after <value> characters. 0 = no truncation
		showTrack: true,	// If true, track number will be displayed
		getRelative: 0,		// Show relative rather than absolute time when less than <value> minutes left to departure, 0 = stay absolute
		coloredIcons: false,	// Setting this to true will color departure icons according to colors in colorTable
		iconTable: {
			"B": "fa fa-bus",
			"S": "fa fa-subway",
			"J": "fa fa-train",
			"U": "fa fa-subway",
			"F": "fa fa-ship",
		},
		colorTable: {
			"B": "#DA4439",
			"S": "#019CD5",
			"J": "#FDB813",
			"U": "#019CD5",
			"F": "#444400",
		},
	},

	// Define required styles.
	getStyles: function () {
		return ["MMM-ResRobot.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define required translations.
	getTranslations: function () {
		return {
			en: "translations/en.json",
			sv: "translations/sv.json",
		};
	},

	// Define start sequence.
	start: function () {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(this.config.language);

		this.initConfig();
	},

	socketNotificationReceived: function (notification, payload) {
		//Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if (notification === "DEPARTURES") {
			this.departures = payload;
			this.loaded = true;
			this.scheduleUpdate(0);
		}
	},

	// Init config
	initConfig: function () {
		this.departures = [];
		this.delays = [];
		this.loaded = false;
		this.sendSocketNotification("CONFIG", this.config);
	},

	// Override dom generator.
	getDom: function () {
		var wrapper = document.createElement("div");

		if (this.config.routes === "") {
			wrapper.innerHTML = "Please set at least one route to watch name: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			Log.log(this.name + " is not loaded!!!");
			wrapper.innerHTML = "Hämtar tidtabell...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var table = document.createElement("table");
		table.className = "small";

		var cutoff = moment().add(moment.duration(this.config.skipMinutes, "minutes"));
		var n = 0;
		for (var d in this.departures) {
			if (n >= this.config.maximumEntries) {
				break;
			}
			var departure = this.departures[d];

			let calculatedDepartureTime = departure.updatedTime
				? moment.unix(departure.updatedTime)
				: moment(departure.timestamp);

			if (calculatedDepartureTime.isBefore(cutoff)) {
				continue; //this is done in node_helper as well!
			}
			n++;

			var row = document.createElement("tr");
			table.appendChild(row);

			var depTimeCell = document.createElement("td");
			depTimeCell.className = "departuretime";
			depTimeCell.innerHTML = departure.departureTime;
			if (departure.waitingTime < this.config.getRelative) {
				if (departure.waitingTime > 1 || departure.waitingTime < 0) {
					depTimeCell.innerHTML = departure.waitingTime + " " + this.translate("MINUTES_SHORT");
				} else {
					depTimeCell.innerHTML = "<1 min";
				}
			}
			//add GTFS-delay to timetable if pressent!
			if (departure.delay && departure.delay !== 0) {
				if (departure.delay > 0) {
					if (departure.delay < 60 && departure.delay >= 20) {
						depTimeCell.innerHTML += ` (+${departure.delay}s)`;
					} else if (departure.delay >= 60) {
						const delayMinutes = Math.round(departure.delay / 60)
						depTimeCell.innerHTML += ` (+${delayMinutes}m)`
					}
				} else {
					if (departure.delay > -60 && departure.delay < -20) {
						depTimeCell.innerHTML += ` (${departure.delay}s tidig!)`;
					} else if (departure.delay <= -60){
						const delayMinutes = Math.round(departure.delay / 60)
						depTimeCell.innerHTML += ` (${-delayMinutes}m tidig!)`
					}
				}
			}

			row.appendChild(depTimeCell);

			var depTypeCell = document.createElement("td");
			depTypeCell.className = "linetype";
			var typeSymbol = document.createElement("span");
			typeSymbol.className = this.config.iconTable[departure.type.charAt(0)];
			if (this.config.coloredIcons) {
				if (this.config.colorTable[departure.type]) {
					typeSymbol.setAttribute("style", "color:" + this.config.colorTable[departure.type]);
				} else {
					typeSymbol.setAttribute("style", "color:" + this.config.colorTable[departure.type.charAt(0)]);
				}
			}
			depTypeCell.appendChild(typeSymbol);
			row.appendChild(depTypeCell);

			var depLineCell = document.createElement("td");
			depLineCell.className = "lineno";
			depLineCell.innerHTML = departure.line;
			row.appendChild(depLineCell);

			if (this.config.showTrack) {
				var depTrackCell = document.createElement("td");
				depTrackCell.className = "trackno";
				depTrackCell.innerHTML = departure.track || " ";
				row.appendChild(depTrackCell);
			}

			var depToCell = document.createElement("td");
			depToCell.className = "to";
			depToCell.innerHTML = departure.to;
			//row.appendChild(depToCell);

			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = this.config.maximumEntries * this.config.fadePoint;
				var steps = this.departures.length - startingPoint;
				if (d >= startingPoint) {
					var currentStep = d - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}

		}
		if (n === 0) {
			// No departures found so resend config
			this.initConfig();
		}
		return table;
	},
	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, 10 seconds is used.
	 */
	scheduleUpdate: function (delay) {
		var nextLoad = 10000;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function () {
			self.updateDom();
			self.scheduleUpdate(10000);
		}, nextLoad);
	},
});
