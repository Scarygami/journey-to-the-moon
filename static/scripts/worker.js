self.addEventListener("message", function (e) {
  "use strict";

  var
    data = e.data,
    phase = 0,
    deg2rad = Math.PI / 180,
    km2miles = 0.621371,
    total = [384400, 563000000],
    R = 6371,
    current = 0,
    distance = 50390000,
    cities = [],
    countries = [],
    cityCache = {},
    cityLookup = {},
    countryLookup = {},
    hourStats = [["Hour", "Distance (km)"]],
    weekdayStats = [["Weekday", "Distance (km)"], ["Mon", 0], ["Tue", 0], ["Wed", 0], ["Thu", 0], ["Fri", 0], ["Sat", 0], ["Sun", 0]],
    dateStats = [["Date", "Distance (km)"]], lastDate,
    start = (new Date()).getTime(), i;

  Date.prototype.niceDate = function () {
    var y, m, d;
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d  = this.getDate().toString();
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
  };

  // Haversine formula
  function distanceFromLatLng(lat1, lon1, lat2, lon2) {
    var dLat, dLon, a, c;

    dLat = (lat2 - lat1) * deg2rad / 2;
    dLon = (lon2 - lon1) * deg2rad / 2;
    lat1 = lat1 * deg2rad;
    lat2 = lat2 * deg2rad;

    a = Math.sin(dLat) * Math.sin(dLat) + Math.sin(dLon) * Math.sin(dLon) * Math.cos(lat1) * Math.cos(lat2);
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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

  function displayStats(finished) {
    var i, countryData = [["Country", "Time (h)"]], cityData = [["City", "Country", "Time (h)"]], perc, left;

    for (i = 0; i < countries.length; i++) {
      countryData.push([countries[i].country, Math.round(countries[i].time / 3600000)]);
    }

    for (i = 0; i < cities.length; i++) {
      cityData.push([cities[i].city, (cities[i].country || "Unknown country"), Math.round(cities[i].time / 3600000)]);
    }

    perc = distance / total[phase] * 100;

    if (perc > 100 && phase < total.length - 1) {
      phase += 1;
      perc = distance / total[phase] * 100;
    }

    left = total[phase] - distance;
    if (left < 0) { left = 0; }

    if (finished) {
      self.postMessage({
        type: "final_update",
        cityData: cityData,
        countryData: countryData,
        currentStat: data.locations.length - current,
        totalStats: data.locations.length,
        hourStats: hourStats,
        weekdayStats: weekdayStats,
        dateStats: dateStats,
        date: (new Date(parseInt(data.locations[current].timestampMs, 10))).niceDate(),
        percent: perc,
        left: left,
        distance: distance,
        total: total[phase],
        phase: phase,
        finished: true
      });
    } else {
      self.postMessage({
        type: "update",
        currentStat: data.locations.length - current,
        date: (new Date(parseInt(data.locations[current].timestampMs, 10))).niceDate(),
        totalStats: data.locations.length,
        percent: perc,
        left: left,
        total: total[phase],
        phase: phase,
        distance: distance,
        finished: false
      });
    }
  }

  function stats() {
    var
      location1, location2, lat2, lon2, lat, lon, d, time1, time2,
      city, cityKey, cityStat, countryStat, h, day, tmpDate,
      now = (new Date()).getTime();

    // accumulate distance
    if (current > 0) {
      location1 = data.locations[current];
      location2 = data.locations[current - 1];

      lat = location1.latitudeE7 / 10000000;
      lon = location1.longitudeE7 / 10000000;
      lat2 = location2.latitudeE7 / 10000000;
      lon2 = location1.longitudeE7 / 10000000;

      d = distanceFromLatLng(lat, lon, lat2, lon2);
      distance += d;

      time1 = new Date(parseInt(data.locations[current].timestampMs, 10));
      h = time1.getHours() + 1;
      day = time1.getDay();
      day = (day === 0) ? 7 : day;

      hourStats[h][1] += d;
      weekdayStats[day][1] += d;

      if (!lastDate || time1.niceDate() !== lastDate.niceDate()) {
        if (lastDate) {
          tmpDate = new Date(lastDate.getTime() + 86400000);
          while (tmpDate.niceDate() !== time1.niceDate()) {
            dateStats.push([tmpDate.niceDate(), 0]);
            tmpDate.setTime(tmpDate.getTime() + 86400000);
          }
        }
        lastDate = time1;
        dateStats.push([lastDate.niceDate(), 0]);
      }
      dateStats[dateStats.length - 1][1] += d;
    }

    // Find city/country
    lat = Math.round(data.locations[current].latitudeE7 / 10000) / 1000;
    lon = Math.round(data.locations[current].longitudeE7 / 10000) / 1000;

    if (current === 0) {
      time1 = parseInt(data.locations[current].timestampMs, 10);
    } else {
      time1 = parseInt(data.locations[current - 1].timestampMs, 10);
    }
    if (current === data.locations.length - 1) {
      time2 = parseInt(data.locations[current].timestampMs, 10);
    } else {
      time2 = parseInt(data.locations[current + 1].timestampMs, 10);
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
    if (now - start > 30) {
      start = now;
      displayStats(false);
    }
  }

  for (i = 0; i < 24; i++) {
    hourStats.push([i.toString(), 0]);
  }

  if (data.locations && data.locations.length > 0 && data.locations[0].timestampMs && data.locations[0].latitudeE7 && data.locations[0].longitudeE7) {
    current = data.locations.length - 1;
    while (current >= 0) {
      stats();
      current -= 1;
    }
    current = 0;
    displayStats(true);
  }

}, false);