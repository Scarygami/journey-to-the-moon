(function (global) {
  "use strict";
  var
    doc = global.document, con = global.console, dropbox, locations, current, distance, dateDiv, travelledDiv, leftDiv, rocket,
    total = 384400, km2miles = 0.621371, R = 6371, deg2rad = Math.PI / 180;

  dropbox = doc.getElementById("dropbox");
  dateDiv = doc.getElementById("date");
  travelledDiv = doc.getElementById("travelled");
  leftDiv = doc.getElementById("left");
  rocket = doc.getElementById("rocket");

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
    } else {
      // Too big to be considered
      return 100;
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

    dateDiv.innerHTML = time1.niceDate();

    travelledDiv.style.width = perc + "%";
    leftDiv.style.width = Math.min(100 - perc, 100) + "%";
    leftDiv.style.left = perc + "%";
    rocket.style.left = perc + "%";
    travelledDiv.innerHTML = distance.formatWithCommas() + " km<br>" + (distance * km2miles).formatWithCommas() + " miles";

    left = total - distance;
    if (left < 0) { left = 0; }
    leftDiv.innerHTML = left.formatWithCommas() + " km<br>" + (left * km2miles).formatWithCommas() + " miles";

    if (!travelledDiv.style.paddingRight) {
      if (travelledDiv.offsetWidth > 25) {
        travelledDiv.style.paddingRight = "25px";
      }
    }

    if (current > 0) {
      global.requestAnimationFrame(travel);
    }
  }

  function start() {
    var xhr = new global.XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var response, text;
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status <= 304) {
          global.console.log("Success: " + xhr.responseText);
          response = JSON.parse(xhr.responseText);
          con.log(response);
          dropbox.style.display = "none";
          doc.getElementById("instructions").style.display = "none";
          global.requestAnimationFrame(travel);
        } else {
          con.log("Couldn't fetch city data.");
        }
      }
    };

    xhr.open("GET", "cities.json", true);
    xhr.send();
  }

  function handleFile(file) {
    var reader, data;
    reader = new global.FileReader();

    reader.onload = function (eventObj) {
      data = {};
      try {
        data = JSON.parse(eventObj.target.result);
      } catch (e) {
        dropbox.innerHTML = "Start aborted!<br>Invalid file format.";
        return;
      }
      if (data && data.locations && data.locations.length > 0) {
        // check first location for valid format
        if (data.locations[0].timestampMs && data.locations[0].latitudeE7 && data.locations[0].longitudeE7) {
          locations = data.locations;
          dropbox.innerHTML = "Ready for Take-off!";
          current = locations.length - 1;
          distance = 0;
          start();
        } else {
          dropbox.innerHTML = "Start aborted!<br>No valid location found in file.";
        }
      } else {
        dropbox.innerHTML = "Start aborted!<br>No locations found in file.";
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
      dropbox.innerHTML = "Preparing start!";
      handleFile(files[0]);
    }

    dropbox.className = "";
  }

  dropbox.addEventListener("dragover", handleDragOver, false);
  dropbox.addEventListener("drop", handleFileSelect, false);
  dropbox.addEventListener("dragenter", function () {
    dropbox.className = "dragging";
  }, false);
  dropbox.addEventListener("dragleave", function () {
    dropbox.className = "";
  }, false);

}(this));