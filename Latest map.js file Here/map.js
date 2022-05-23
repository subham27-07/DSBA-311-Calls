//Global Variables:
//Create a table to store the total services per tract
const table = {};

//Define geoJSON here to be accessible to all listeners' functions
var geojson, NON_RECYCLABLE_ITEMS, coloredtracts;

//baseLayers,overlays are special for layer control attribute
let baseLayers, overlays, layerControl;

//create the map and set the map center to mecklenburg county
var map = L.map('map').setView([35.176315, -80.755928], 10);

// Tile layers:
var grayscale = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/light-v9',
    tileSize: 512,
    zoomOffset: -1
});
var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Fetch statistics about total services per tract
fetch('number_of_service_requests_by_tract.csv').then(async (response) => {

    const text = await response.text();
    const lines = text.split('\n');


    lines.slice(2).forEach((line) => {
        const values = line.split(',');
        const tractName = values[0];
        let quantity = parseInt(values[1], 10);
        if (tractName != '') {
            table[tractName] = quantity;
        }
    });


});
// Fetch statistics about total demographic data per tract
const demographic_table = {};
fetch('demographic_data.csv').then(async (response) => {

    const text = await response.text();
    const lines = text.split('\n');


    lines.slice(2).forEach((line) => {
        const values = line.split(',');
        const tractName = values[0];
        let quantity = [];
        let total_population=parseInt(values[1],10) +parseInt(values[2],10)+parseInt(values[3],10)+
            parseInt(values[4],10)+parseInt(values[5],10)+parseInt(values[6],10);
        quantity[0] =  Math.round(((parseInt(values[1],10)/total_population) *100)* 100)/100;
        quantity[1] = Math.round(((parseInt(values[2],10)/total_population) *100)* 100)/100;
        quantity[2] = Math.round(((parseInt(values[3],10)/total_population) *100)* 100)/100;
        quantity[3] = Math.round(((parseInt(values[4],10)/total_population) *100)* 100)/100;
        quantity[4] = Math.round(((parseInt(values[5],10)/total_population) *100)* 100)/100;
        quantity[5] = Math.round(((parseInt(values[6],10)/total_population) *100)* 100)/100;
        quantity[6] = total_population;

        if (tractName != '') {
            demographic_table[tractName] = quantity;
        }


    });


});

// Fetch statistics about the top five types of 311 requests per tract
const topRequests_table = {};
fetch('demographic_data.csv').then(async (response) => {

    const text = await response.text();
    const lines = text.split('\n');


    lines.slice(2).forEach((line) => {
        const values = line.split(',');
        const tractName = values[0];
        let quantity =[];
        quantity[0]= parseInt(values[1], 10);
        quantity[1]= parseInt(values[2], 10);
        quantity[2]= parseInt(values[3], 10);
        quantity[3]= parseInt(values[4], 10);
        quantity[4]= parseInt(values[5], 10);
        quantity[5]= parseInt(values[6], 10);
        if (tractName != '') {
            topRequests_table[tractName] = quantity;
        }


    });


});
//----------------------------------------------------------------------------------------------------
//Control layer (control mouse hover actions):
//using control layer to show name and total services about specific tract, and populations distribution
var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div1', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

//Update the info based on feature properties passed ( props = tracts names, totalServicePerTract)
info.update = function (props, services,populations) {
    this._div.innerHTML = (props ?
        '<h4 style="color:green;">Tract Name:</h4>' + '<b>' + props.NAME + '</b><br />' +
        // Show total services request
        '<h4 style="color:darkblue;">Total Service Requests:</h4>' + services[0]+ '<br><br />' +
        //show populations data
        '<h4 style="color:#6b0a3c;">Total populations:</h4>' + populations[6]+
        '<h4>White American:</h4>' +  populations[0] +'%' +
        '<h4>African American:</h4>' + populations[1] +'%'+ '<h4>American Indian and Alaska Native:</h4>' + populations[2] +'%'+
        '<h4> Asian:</h4>' + populations[3] +'%'+ '<h4>Native Hawaiian and Other Pacific Islander:</h4>' + populations[4] +'%'+
        '<h4> Other Race:</h4>' + populations[5]+'%'+ '<br><br />'+

        //show top Five Requests types per tract///The top five types of 311 services
        '<br><br />' +'<h4 style="color:#da5c24;">The top five types of 311 services:</h4>' +
        '<h4> NON_RECYCLABLE_ITEMS:</h4>' + services[1]+
        '<h4> RECYCLABLE_ITEMS:</h4>' + services[2]+
        '<h4> HNS_HEALTH_AND_SANITATION:</h4>' + services[3]+
        '<h4> CART_REPAIR_GARBAGE:</h4>' + services[4]+
        '<h4> MISSED_RECYCLING:</h4>' + services[5]

        : 'Select Mecklenburg then Hover over a tract');
};
info.addTo(map);

//---------------------------------------------------------------------------------------

// Interaction part and geoJson Layer//

//listener 1 - mouse on
function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#a30d0d',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    info.update(layer.feature.properties, topRequests_table[layer.feature.properties.NAME],demographic_table[layer.feature.properties.NAME]);

}

//listener 2 - mouse out
function resetHighlight(e) {
    geojson.resetStyle(e.target);
    coloredtracts.resetStyle(e.target);
    info.update();

}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
}

///GeoJSON layer:
// Fetch GeoJSON and setup layer control
fetch('Mecklenburg County Tracts.geojson').then(async (response) => {
    const data = await response.json();
    geojson = L.geoJson(data, {
        onEachFeature: onEachFeature
    })

    const minValue = 0; //Math.min(...Object.values(table));
    const maxValue = Math.max(...Object.values(table));
    const valueRange = maxValue - minValue;

    console.log(minValue, maxValue, Object.values(table));

    function getColor(v) {
        let lightness = 50 + 50 * (1 - ((v - minValue) / valueRange));
        return `hsl(0, 100%, ${lightness}%)`;
    }

    function doStyle(feature) {

        return {
            fillColor: getColor(table[feature.properties.NAME]),
            weight: 1,
            opacity: 1,
            color: '#666',
            fillOpacity: 0.667
        };
    }

    // colored tracts:
    coloredtracts = L.geoJson(data, {
        onEachFeature: onEachFeature,
        style: doStyle
    })

////

    //Control layer setup
    baseLayers = {
        'Grayscale': grayscale,
        'OpenStreetMap': OpenStreetMap_Mapnik
    };

    overlays = {
        'Mecklenburg Tracts': geojson,
        'Distribution of services': coloredtracts
    };
    layerControl = L.control.layers(baseLayers, overlays).addTo(map);


});
