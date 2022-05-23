const map = L.map('map');

const raceOptions = [
    'White',
    'Black or African American',
    'American Indian and Alaska Native',
    'Asian',
    'Native Hawaiian and Other Pacific Islander',
    'Some Other Race',
];


const appState = PetiteVue.reactive({
    currentTract: null,
    currentShading: null,
    shadingOptions: [],
    shadingChanged: () => {},
    raceOptions,
    formatNumber: (number, places) => number.toLocaleString({minimumFractionDigits: places, maximumFractionDigits: places}),
    formatPercent: (number, places) => (number * 100).toFixed(places) + '%'
});

PetiteVue.createApp(appState).mount("#sidebar");


// Tile layers:
const tileLayers = {
    'Grayscale': L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/light-v9',
        tileSize: 512,
        zoomOffset: -1
    }),
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }),
};

tileLayers['Grayscale'].addTo(map);
L.control.layers(tileLayers, []).addTo(map);


function fetchJSON(url) {
    return fetch(url).then((response) => response.json());
}

function fetchCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            dynamicTyping: (column) => column != 'name' && column != 'tract_name',
            complete: (results) => resolve(results.data),
            error: (err) => reject(err),
        });
    });
}


Promise.all([
    fetchJSON('Mecklenburg County Tracts.geojson'),
    fetchCSV('tract_info.csv'),
    fetchCSV('top10.csv'),
]).then(([geojson, tractList, topRequestTypes]) => {

    const tractTable = {};
    tractList.forEach((data) => {
        tractTable[data.name] = data;
        data.topRequestTypes = [];
    });

    topRequestTypes.forEach((row) => {
        tractTable[row.tract_name].topRequestTypes.push({
            label: row.request_type,
            count: row.request_count,
        });
    });

    function defineShadingOption(options) {
        const sortedValues = tractList.map(options.selector).sort((a, b) => b - a);
        let max = sortedValues[0];
        if (sortedValues[0] > 2 * sortedValues[1]) {
            max = sortedValues[1];
        }

        function getColor(v) {
            v = Math.min(v, max);
            let lightness = 50 + 50 * (1 - (v / max));
            return `hsl(${options.hue}, 100%, ${lightness}%)`;
        }
    
        return {
            name: options.name,
            hue: options.hue,
            max,
            isPercent: options.isPercent || false,
            styleFn: (feature) => {
                const tract = tractTable[feature.properties.NAME];
                console.log(feature, tract);
                return {
                    fillColor: getColor(options.selector(tract)),
                    weight: 1,
                    opacity: 1,
                    color: '#666',
                    fillOpacity: 0.667
                };
            },
        };
    }

    function ifHasPopulation(subselector) {
        return function (tract) {
            if (tract.population > 0) {
                return subselector(tract);
            }
            return 0;
        }
    }

    appState.shadingOptions = [
        defineShadingOption({
            name: 'Total number of service requests',
            hue: 0,
            selector: (tract) => tract.requestCount,
        }),
        defineShadingOption({
            name: 'Total population',
            hue: 225,
            selector: (tract) => tract.population,
        }),
        defineShadingOption({
            name: 'Number of service requests per capita',
            hue: 270,
            selector: ifHasPopulation((tract) => tract.requestCount / tract.population),
        }),
    ];

    raceOptions.forEach((race) => {
        appState.shadingOptions.push(defineShadingOption({
            name: 'Percent of population that identifes as ' + race,
            hue: 120,
            selector: ifHasPopulation((tract) => tract[race] / tract.population),
            isPercent: true,
        }));
    });

    appState.currentShading = appState.shadingOptions[0];

    const tractLayer = L.geoJson(geojson, {
        style: appState.currentShading.styleFn,
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: () => {
                    appState.currentTract = tractTable[feature.properties.NAME];
                },
                mouseout: () => {
                    if (appState.currentTract && appState.currentTract.name == feature.properties.NAME) {
                        appState.currentTract = null;
                    }
                }
            });
        }
    });

    appState.shadingChanged = () => {
        tractLayer.setStyle(appState.currentShading.styleFn);
    }

    tractLayer.addTo(map);
    map.fitBounds(tractLayer.getBounds());

});
