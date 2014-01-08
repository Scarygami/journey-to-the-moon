self.addEventListener('message', function(e) {

    Date.prototype.niceDate = function () {
        var y, m, d;
        y = this.getFullYear().toString();
        m = (this.getMonth() + 1).toString();
        d  = this.getDate().toString();
        return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
    };

    var data = e.data;
    var currentStat = 0;
    var cities = [],
        countries = [],
        cityCache = {},
        cityLookup = {},
        countryLookup = {};

    if (data.locations && data.locations.length > 0 && data.locations[0].timestampMs && data.locations[0].latitudeE7 && data.locations[0].longitudeE7) {
        while (currentStat < data.locations.length) {
            cityStats();
        }
        currentStat -= 1;
        displayStats(true);
    }

    function cityStats() {
        var lat, lon, d, time1, time2, city, cityKey, cityStat, countryStat;
        lat = Math.round(data.locations[currentStat].latitudeE7 / 10000) / 1000;
        lon = Math.round(data.locations[currentStat].longitudeE7 / 10000) / 1000;

        if (currentStat === 0) {
            time1 = parseInt(data.locations[currentStat].timestampMs, 10);
        } else {
            time1 = parseInt(data.locations[currentStat - 1].timestampMs, 10);
        }
        if (currentStat === data.locations.length - 1) {
            time2 = parseInt(data.locations[currentStat].timestampMs, 10);
        } else {
            time2 = parseInt(data.locations[currentStat + 1].timestampMs, 10);
        }
        d = (time1 - time2) / 2;

        city = findCity(lat, lon);
        cityKey = city[0] + "/" + (city[3] || "");
        cityStat = cityLookup[cityKey];
        if (!cityStat) {
            cityStat = {
                "city": city[0],
                "country": data.cities.countries[city[3]] || "Unknown country",
                "time": 0
            };
            cityLookup[cityKey] = cityStat;
            cities.push(cityStat);

            countryStat = countryLookup[cityStat.country];
            if (!countryStat) {
                countryStat = {
                    "country": cityStat.country,
                    "time": 0
                };
                countryLookup[cityStat.country] = countryStat;
                countries.push(countryStat);
            }
        } else {
            countryStat = countryLookup[cityStat.country];
        }
        cityStat.time += d;
        countryStat.time += d;
        if (currentStat % 5000 === 0) {
            displayStats(false);
        }
        currentStat += 1;
    }

    function displayStats(finished) {
        var i, countryData = [["Country", "Time (h)"]], cityData = [["City", "Country", "Time (h)"]];

        for (i = 0; i < countries.length; i++) {
            countryData.push([countries[i].country, Math.round(countries[i].time / 3600000)]);
        }

        for (i = 0; i < cities.length; i++) {
            cityData.push([cities[i].city, (cities[i].country || "Unknown country"), Math.round(cities[i].time / 3600000)]);
        }

        self.postMessage({
            type: "analyzeUpdate",
            cityData: cityData,
            countryData: countryData,
            currentStat: currentStat,
            date: (new Date(parseInt(data.locations[currentStat].timestampMs, 10))).niceDate(),
            total: data.locations.length,
            finished: finished
        });
    }

    function lazyDistance(lat1, lon1, lat2, lon2) {
        var dLat, dLon;
        dLat = lat2 - lat1;
        dLon = lon2 - lon1;
        if (dLat < 1 && dLat > -1 && dLon < 1 && dLon > -1) {
            // Inside of 1° we can pretty much ignore curves
            // We also only need a comparable value, so no need for Math.sqrt or converting to km
            return dLat * dLat + dLon * dLon;
        }

        // Too big to be considered
        return false;
    }

    function findCity(lat, lon) {
        var i, city, d, minD = 10000;
        if (cityCache[lat + "," + lon] !== undefined) {
            return cityCache[lat + "," + lon];
        }
        for (i = 0; i < data.cities.cities.length; i++) {
            d = lazyDistance(lat, lon, data.cities.cities[i][1], data.cities.cities[i][2]);
            if (d !== false && d < minD) {
                city = data.cities.cities[i];
                minD = d;
            }
        }
        if (!city) {
            city = ["Unknown city", lat, lon, "Unknown country"];
        }
        cityCache[lat + "," + lon] = city;
        return city;
    }

}, false);