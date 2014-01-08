(function (global) {
  "use strict";
  var
    doc = global.document,
    con = global.console,
    dom = {
      "dropbox": doc.getElementById("dropbox"),
      "status": doc.getElementById("status"),
      "cities": doc.getElementById("cities"),
      "countries": doc.getElementById("countries"),
      "countryChart": doc.getElementById("country_chart"),
      "rocketExhaust": doc.getElementById("rocketExhaust"),
      "progressKM": doc.getElementById("progressKM"),
      "progressMiles": doc.getElementById("progressMiles"),
      "rocket": doc.getElementById("rocket")
    },
    countryChart, countryTable, cityTable,
    locations,
    km2miles = 0.621371;

  function setClassDisplay(className, display) {
    var i, elems = doc.getElementsByClassName(className);
    if (elems) {
      for (i = 0; i < elems.length; i++) {
        elems[i].style.display = display;
      }
    }
  }

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

  function displayStats(e) {
    var data = e.data, countryData, cityData;

    dom.rocketExhaust.style.width = data.percent + "%";
    dom.rocket.style.left = data.percent + "%";
    dom.progressKM.innerHTML = data.distance.formatWithCommas() + " / 384,400 km (" + data.left.formatWithCommas() + " left)<br><br>";
    dom.progressMiles.innerHTML = (data.distance * km2miles).formatWithCommas() + " / 238,855 miles (" + (data.left * km2miles).formatWithCommas() + " left)<br><br>";

    if (data.finished) {
      dom.status.innerHTML = "";
      setClassDisplay("running", "none");
      setClassDisplay("preparing", "none");
      setClassDisplay("finished", "block");
      countryChart = new global.google.visualization.GeoChart(dom.countryChart);
      countryTable = new global.google.visualization.Table(dom.countries);
      cityTable = new global.google.visualization.Table(dom.cities);
      countryData = global.google.visualization.arrayToDataTable(data.countryData);
      cityData = global.google.visualization.arrayToDataTable(data.cityData);
      countryChart.draw(countryData);
      countryTable.draw(countryData, {"sortColumn": 1, "sortAscending": false});
      cityTable.draw(cityData, {"sortColumn": 2, "sortAscending": false});
    } else {
      dom.status.innerHTML = "Analyzing data... " + data.currentStat + " / " + data.total + " (" + data.date + ")<br><br>";
    }
  }

  function start() {
    var worker, xhr;

    xhr = new global.XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var cityData;
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status <= 304) {
          cityData = JSON.parse(xhr.responseText);
        }
        if (!cityData) {
          con.log("Couldn't fetch city data, no geolocation possible.");
          dom.status.innerHTML = "<b>Start aborted! Unexpected error...</b><br><br>";
        } else {
          dom.status.innerHTML = "<b>Ready for Take-off!</b><br><br>";
          setClassDisplay("running", "block");
          worker = new global.Worker("/scripts/worker.js");
          worker.addEventListener("message", displayStats, false);
          worker.postMessage({locations: locations, cities: cityData});
        }
      }
    };

    xhr.open("GET", "/cities.json?v=3", true);
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
        dom.status.innerHTML = "<b>Start aborted! Invalid file format.</b><br><br>";
        return;
      }
      if (data && data.locations && data.locations.length > 0) {
        // check first location for valid format
        if (data.locations[0].timestampMs && data.locations[0].latitudeE7 && data.locations[0].longitudeE7) {
          locations = data.locations;
          dom.status.innerHTML = "<b>Preparing start...</b><br><br>";
          setClassDisplay("init", "none");
          setClassDisplay("running", "block");
          global.google.load(
            "visualization",
            "1",
            {
              "packages": ["geochart", "table"],
              "callback": function () {
                global.setTimeout(start, 0);
              }
            }
          );
        } else {
          dom.status.innerHTML = "<b>Start aborted! No valid location found in file.</b><br><br>";
        }
      } else {
        dom.status.innerHTML = "<b>Start aborted! No locations found in file.</b><br><br>";
      }
    };

    reader.readAsText(file);
  }

  function handleDragOver(eventObj) {
    eventObj.stopPropagation();
    eventObj.preventDefault();
    eventObj.dataTransfer.dropEffect = "copy";
  }

  function handleFileUpload(eventObj) {
    var files = eventObj.target.files;
    if (files && files.length > 0) {
      dom.status.innerHTML = "<b>Preparing start...</b><br><br>";
      handleFile(files[0]);
    }
  }

  function handleFileSelect(eventObj) {
    var files;
    eventObj.stopPropagation();
    eventObj.preventDefault();

    files = eventObj.dataTransfer.files;
    if (files && files.length > 0) {
      dom.status.innerHTML = "<b>Preparing start...</b><br><br>";
      handleFile(files[0]);
    }

    dom.dropbox.className = "";
  }

  dom.dropbox.onclick = function () {
    doc.getElementById("upload").click();
  };

  doc.getElementById("upload").addEventListener('change', handleFileUpload, false);

  dom.dropbox.addEventListener("dragover", handleDragOver, false);
  dom.dropbox.addEventListener("drop", handleFileSelect, false);
  dom.dropbox.addEventListener("dragenter", function () {
    dom.dropbox.className = "dragging";
  }, false);
  dom.dropbox.addEventListener("dragend", function () {
    dom.dropbox.className = "";
  }, false);

}(this));