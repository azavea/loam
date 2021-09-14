/* global loam */

// Use the locally built version of loam, with a CDN copy of GDAL from unpkg.
loam.initialize('/', 'https://unpkg.com/gdal-js@2.0.0/');

const EPSG4326 =
    'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]';

function displayInfo() {
    const file = document.querySelector('#geotiff-file').files[0];
    const displayElem = document.getElementById('gdalinfo');

    // Clear display text
    displayElem.innerText = '';
    // Use Loam to get GeoTIFF metadata
    loam.open(file).then((ds) => {
        return Promise.all([ds.width(), ds.height(), ds.count(), ds.wkt(), ds.transform()]).then(
            ([width, height, count, wkt, geoTransform]) => {
                displayElem.innerText +=
                    'Size: ' + width.toString() + ', ' + height.toString() + '\n';
                displayElem.innerText += 'Band count: ' + count.toString() + '\n';
                displayElem.innerText += 'Coordinate system:\n' + wkt + '\n';

                const cornersPx = [
                    [0, 0],
                    [width, 0],
                    [width, height],
                    [0, height],
                ];
                const cornersGeo = cornersPx.map(([x, y]) => {
                    return [
                        // http://www.gdal.org/gdal_datamodel.html
                        geoTransform[0] + geoTransform[1] * x + geoTransform[2] * y,
                        geoTransform[3] + geoTransform[4] * x + geoTransform[5] * y,
                    ];
                });

                loam.reproject(wkt, EPSG4326, cornersGeo).then((cornersLngLat) => {
                    displayElem.innerText += 'Corner Coordinates:\n';
                    cornersLngLat.forEach(([lng, lat], i) => {
                        displayElem.innerText +=
                            '(' +
                            cornersGeo[i][0].toString() +
                            ', ' +
                            cornersGeo[i][1].toString() +
                            ') (' +
                            lng.toString() +
                            ', ' +
                            lat.toString() +
                            ')\n';
                    });
                });
            }
        );
    });
}

document.getElementById('geotiff-file').onchange = function () {
    displayInfo();
};
