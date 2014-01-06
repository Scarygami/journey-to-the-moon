(function (global) {
  "use strict";
  var
    doc = global.document,
    con = global.console,
    dom = {
      "dropbox": doc.getElementById("dropbox"),
      "date": doc.getElementById("date"),
      "stats": doc.getElementById("stats"),
      "statsInfo": doc.getElementById("stats_info"),
      "cities": doc.getElementById("cities"),
      "countries": doc.getElementById("countries"),
      "countryChart": doc.getElementById("country_chart"),
      "travelled": doc.getElementById("travelled"),
      "left": doc.getElementById("left"),
      "rocket": doc.getElementById("rocket")
    },
    countryChart, countryTable, cityTable,
    locations,
    current,
    currentStat,
    distance,
    total = 384400,
    km2miles = 0.621371,
    R = 6371,
    deg2rad = Math.PI / 180,
    cityData,
    cities = [],
    countries = [],
    cityCache = {},
    cityLookup = {},
    countryLookup = {};

  Date.prototype.niceDate = function () {
    var y, m, d;
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d  = this.getDate().toString();
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
  };

  Number.prototype.formatWithCommas = function () {
    return Math.round(this).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    for (i = 0; i < cityData.cities.length; i++) {
      d = lazyDistance(lat, lon, cityData.cities[i][1], cityData.cities[i][2]);
      if (d !== false && d < minD) {
        city = cityData.cities[i];
        minD = d;
      }
    }
    if (!city) {
      city = ["Unknown city", lat, lon, "Unknown country"];
    }
    cityCache[lat + "," + lon] = city;
    return city;
  }

  function formatDuration(d) {
    var min, h, days;
    days = Math.floor(d / 86400000);
    d -= days * 86400000;
    h = Math.floor(d / 3600000);
    d -= h * 3600000;
    min = Math.floor(d / 60000);

    return (days > 0 ? days + "d " : "") + h + "h " + min + "m";
  }

  function timeSort(a, b) {
    return b.time - a.time;
  }

  function displayStats(final) {
    var i, countryData = [["Country", "Time (h)"]], cityData = [["City", "Country", "Time (h)"]];
    if (final) {
      dom.statsInfo.innerHTML = "";
    } else {
      dom.statsInfo.innerHTML = "Analyzing data... " + currentStat + " / " + locations.length + " (" + (new Date(parseInt(locations[currentStat].timestampMs, 10))).niceDate() + ")";
    }
    for (i = 0; i < countries.length; i++) {
      countryData.push([countries[i].country, Math.round(countries[i].time / 3600000)]);
    }

    for (i = 0; i < cities.length; i++) {
      cityData.push([cities[i].city, (cities[i].country || "Unknown country"), Math.round(cities[i].time / 3600000)]);
    }

    countryData = global.google.visualization.arrayToDataTable(countryData);
    cityData = global.google.visualization.arrayToDataTable(cityData);
    countryChart.draw(countryData, {"width": "640px"});
    countryTable.draw(countryData, {"sortColumn": 1, "sortAscending": false});
    cityTable.draw(cityData, {"sortColumn": 2, "sortAscending": false});
  }

  function cityStats() {
    var lat, lon, d, time1, time2, city, cityKey, cityStat, countryStat;
    lat = Math.round(locations[currentStat].latitudeE7 / 10000) / 1000;
    lon = Math.round(locations[currentStat].longitudeE7 / 10000) / 1000;

    if (currentStat === 0) {
      time1 = parseInt(locations[currentStat].timestampMs, 10);
    } else {
      time1 = parseInt(locations[currentStat - 1].timestampMs, 10);
    }
    if (currentStat === locations.length - 1) {
      time2 = parseInt(locations[currentStat].timestampMs, 10);
    } else {
      time2 = parseInt(locations[currentStat + 1].timestampMs, 10);
    }
    d = (time1 - time2) / 2;

    city = findCity(lat, lon);
    cityKey = city[0] + "/" + (city[3] || "");
    cityStat = cityLookup[cityKey];
    if (!cityStat) {
      cityStat = {
        "city": city[0],
        "country": cityData.countries[city[3]] || "Unknown country",
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
    if (currentStat % 100 === 0) {
      displayStats(false);
    }
    currentStat += 1;
    if (currentStat < locations.length) {
      global.setTimeout(cityStats, 0);
    } else {
      displayStats(true);
    }
  }

  function travel() {
    var location = locations[current], location1, location2, lat1, lon1, lat2, lon2, time1, time2, perc, left;

    time1 = new Date(parseInt(location.timestampMs, 10));
    time2 = new Date(parseInt(location.timestampMs, 10));

    // putting all locations of one day together
    while (current > 0 && time2.getFullYear() == time1.getFullYear() && time2.getMonth() == time1.getMonth() && time2.getDate() == time1.getDate()) {
      location1 = locations[current];
      location2 = locations[current - 1];

      lat1 = location1.latitudeE7 / 10000000;
      lon1 = location1.longitudeE7 / 10000000;
      lat2 = location2.latitudeE7 / 10000000;
      lon2 = location1.longitudeE7 / 10000000;

      distance += distanceFromLatLng(lat1, lon1, lat2, lon2);
      time2 = new Date(parseInt(location2.timestampMs, 10));
      current -= 1;
    }

    perc = distance / total * 100;
    if (perc > 100) { perc = 100; }

    dom.date.innerHTML = time1.niceDate();

    dom.travelled.style.width = perc + "%";
    dom.left.style.width = Math.min(100 - perc, 100) + "%";
    dom.left.style.left = perc + "%";
    dom.rocket.style.left = perc + "%";
    dom.travelled.innerHTML = distance.formatWithCommas() + " km<br>" + (distance * km2miles).formatWithCommas() + " miles";

    left = total - distance;
    if (left < 0) { left = 0; }
    dom.left.innerHTML = left.formatWithCommas() + " km<br>" + (left * km2miles).formatWithCommas() + " miles";

    if (!dom.travelled.paddingFixed) {
      if (dom.travelled.offsetWidth > 25) {
        dom.travelled.style.paddingRight = "25px";
        dom.travelled.paddingFixed = true;
      }
    }

    if (current > 0) {
      global.requestAnimationFrame(travel);
    }
  }

  function start() {
    var xhr = new global.XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status <= 304) {
          cityData = JSON.parse(xhr.responseText);
        } else {
          con.log("Couldn't fetch city data, no geolocation possible.");
        }
        if (!!cityData) {
          currentStat = 0;
          countryChart = new global.google.visualization.GeoChart(dom.countryChart);
          countryTable = new global.google.visualization.Table(dom.countries);
          cityTable = new global.google.visualization.Table(dom.cities);
          global.setTimeout(cityStats, 0);
        }
      }
    };

    xhr.open("GET", "cities.json", true);
    xhr.send();

    current = locations.length - 1;
    distance = 0;
    dom.dropbox.style.display = "none";
    doc.getElementById("instructions").style.display = "none";
    global.requestAnimationFrame(travel);
  }

  function handleFile(file) {
    var reader, data;
    reader = new global.FileReader();

    reader.onload = function (eventObj) {
      data = {};
      try {
        data = JSON.parse(eventObj.target.result);
      } catch (e) {
        dom.dropbox.innerHTML = "Start aborted!<br>Invalid file format.";
        return;
      }
      if (data && data.locations && data.locations.length > 0) {
        // check first location for valid format
        if (data.locations[0].timestampMs && data.locations[0].latitudeE7 && data.locations[0].longitudeE7) {
          locations = data.locations;
          dom.dropbox.innerHTML = "Ready for Take-off!";
          global.google.load(
            "visualization",
            "1",
            {
              "packages": ["geochart", "table"],
              "callback": function () {
                global.setTimeout(start, 500);
              }
            }
          );
        } else {
          dom.dropbox.innerHTML = "Start aborted!<br>No valid location found in file.";
        }
      } else {
        dom.dropbox.innerHTML = "Start aborted!<br>No locations found in file.";
      }
    };

    reader.readAsText(file);
  }

  function handleDragOver(eventObj) {
    eventObj.stopPropagation();
    eventObj.preventDefault();
    eventObj.dataTransfer.dropEffect = "copy";
  }

  function handleFileSelect(eventObj) {
    var files;
    eventObj.stopPropagation();
    eventObj.preventDefault();

    files = eventObj.dataTransfer.files;
    if (files && files.length > 0) {
      dom.dropbox.innerHTML = "Preparing start!";
      handleFile(files[0]);
    }

    dom.dropbox.className = "";
  }

  dom.dropbox.addEventListener("dragover", handleDragOver, false);
  dom.dropbox.addEventListener("drop", handleFileSelect, false);
  dom.dropbox.addEventListener("dragenter", function () {
    dom.dropbox.className = "dragging";
  }, false);
  dom.dropbox.addEventListener("dragleave", function () {
    dom.dropbox.className = "";
  }, false);

}(this));