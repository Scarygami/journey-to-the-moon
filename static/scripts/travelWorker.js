self.addEventListener('message', function(e) {

    var data = e.data;
    var current = 0;
    var distance = 0;
    var deg2rad = Math.PI / 180,
        total = 384400,
        km2miles = 0.621371,
        R = 6371;

    if (data.locations && data.locations.length > 0 && data.locations[0].timestampMs && data.locations[0].latitudeE7 && data.locations[0].longitudeE7) {
        current = data.locations.length - 1;
        setTimeout(travel, 0);
    }

    function travel() {
        var location = data.locations[current], location1, location2, lat1, lon1, lat2, lon2, time1, time2, perc, left;

        time1 = new Date(parseInt(location.timestampMs, 10));
        time2 = new Date(parseInt(location.timestampMs, 10));

        // putting all locations of one day together
        while (current > 0 && time2.getFullYear() == time1.getFullYear() && time2.getMonth() == time1.getMonth() && time2.getDate() == time1.getDate()) {
            location1 = data.locations[current];
            location2 = data.locations[current - 1];

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

        left = total - distance;
        if (left < 0) { left = 0; }
        self.postMessage({
            type: "travelUpdate",
            percent: perc,
            left: left,
            distance: distance,
            date: time1.niceDate()
        });

        if (current > 0) {
            setTimeout(travel, 20);
        }
    }

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
}, false);