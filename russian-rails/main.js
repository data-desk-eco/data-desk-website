// https://seafowl.io/docs/guides/querying-cache-cdn
async function querySeafowl(sql, host = "https://russian-rails.fly.dev") {
  const query = sql.trim().replace(/(?:\r\n|\r|\n)/g, " ");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder("utf-8").encode(query)
  );
  const hash = [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const response = await fetch(
    `${host}/q/${hash}.csv`,
    { headers: { "X-Seafowl-Query": encodeURIComponent(query) } }
  );
  const response_t = await response.text();
  return response_t ? response_t.trim().split("\n").map(JSON.parse) : [];
}

/*async function askGPT() {
  const prompt = `
    It is now March 2023. On 24 February last year, the Russian Federation launched a full-scale invasion of eastern Ukraine involving ground, air and naval forces. With the aid of weapons and financial support from the West, Ukraine has pushed Russian forces back, but the conflict is still ongoing.

    You are a system designed to help investigative journalists and academic researchers explore and understand how flows of refined petroleum products by rail in Russia have allowed and enabled the country's military to prosecute the war.

    In the present exercise, I'll give you a summarised list of rail flows since the start of the war, giving the type of cargo, either the origin or destination railway station for all flows, and then a list of counterpart stations, including the volume shipped to or from each one in kilograms. Your task is to look at the list and select between zero and three flows that you think would be worth further investigation, sticking strictly to the locations shown in the list. Please go beyond simply looking at the volume shipped and think about what sort of facilities or infrastructure might exist at either end, and Russia's broader war aims.

    You must provide your answer as valid JSON in the following form, with no additional text returned either before or after the response:

    [
      {
        "flow_id": 1,
        "origin_station_lat": $lat,
        "origin_station_lon": $lon,
        "destination_station_lat": $lat,
        "destination_station_lon": $lon,
        "volume_kg": $volume_kg,
        "rationale": [Insert your rationale for selecting the flow here]
      },
      {
        "flow_id": 2,
        "origin_station_lat": $lat,
        "origin_station_lon": $lon,
        "destination_station_lat": $lat,
        "destination_station_lon": $lon,
        "volume_kg": $volume_kg,
        "rationale": [Insert your rationale for selecting the flow here]
      }
    ]

    After first generating your answer, double-check it against the original list of flows to make sure you haven't "hallucinated" any information.
  `;
  const direction = document.querySelector('input[name="variable"]:checked').value === "Код станции отправления РФ" ? "destination_station" : "origin_station";
  const opposite_direction = direction === "destination_station" ? "origin_station" : "destination_station";
  const summary = `
    cargo: ${document.getElementById("cargo").value}
    ${direction}: ${flows[0][`${direction}_lat`]}, ${flows[0][`${direction}_lon`]}
    flows: ${flows.map(f => `(lat: ${f[`${opposite_direction}_lat`]}, lon: ${f[`${opposite_direction}_lon`]}, vol: ${f.volume_kg})`).join("; ")}
  `;
  document.getElementById("rationale").innerHTML = "Asking GPT-4 to identify interesting flows...";
  const openai_api_key = await fetch("https://gist.githubusercontent.com/ltrgoddard/5babdc26f9edef3e71993f4e6092f22e/raw/4257fbf8fa7fa27b79f136095cd02fba6cb60ce9/key")
    .then(r => r.text())
    .then(r => atob(r));
  const gpt_flows = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openai_api_key}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      max_tokens: 512,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: summary }
      ],
      temperature: .7
    })
  })
    .then(d => d.json())
    .then(response => {
      const data = response.choices.length > 0 ? JSON.parse(response.choices[0].message.content) : [];
      document.getElementById("rationale").innerHTML = `Asking GPT-4 to identify interesting flows... ${data.length} results!`;
      return data;
    });

  var gpt_routes = ({
    type: "FeatureCollection",
    features: gpt_flows
      .map(f =>
        turf.lineString([
          [ f.origin_station_lon, f.origin_station_lat ],
          [ f.destination_station_lon, f.destination_station_lat ]
        ], f)
      )
  });

  map.addSource("gpt", {
    type: "geojson",
    data: gpt_routes
  });
    
  map.addLayer({
    id: "gpt",
    source: "gpt",
    type: "line",
    paint: {
      "line-color": "#ff0",
      "line-width": ["/", ["get", "volume_kg"], (4e6 / 4)]
    },
    layout: {
      "line-cap": "round"
    }
  });

  map.on("mousemove", "gpt", (e) => {
    document.getElementById("rationale").innerHTML = e.features[0].properties.rationale;
  });

  map.on("mouseleave", "gpt", () => {
    document.getElementById("rationale").innerHTML = "";
  });

}*/

function updateReadout() {
  ["military", "refineries"].forEach(layer => {
    const features = map.queryRenderedFeatures({ layers: [layer] });
    const nearby_names = `<ul>` +
        features.map(d => `<li>${d.properties.Name}</li>`).join("") +
      `</ul>`;
    document.getElementById(layer).innerHTML = nearby_names;
  })
}

async function updateValues() {
  var variable = document.querySelector('input[name="variable"]:checked').value;
  var cargo = document.getElementById("cargo").value;

  var values = await querySeafowl(`
    select
      "${variable}" as variable,
      sum("Объем перевозок, кг") as volume_kg
    from app.flows
    where "Подгруппа груза" = '${cargo}'
    group by "${variable}"
    order by volume_kg desc
  `)
    .then(r => r
      .map(d => `
        <option value="${encodeURIComponent(d.variable)}">
          ${d.variable} (${d3.format(",.2s")(d.volume_kg / 1e3)}t)
        </option>
      `)
      .join("\n")
    );

  document.getElementById("value").innerHTML = values;
  document.getElementById("value").value = document.getElementById("value").options[0].value;
  const urlState = new URLSearchParams(window.location.search);
  if(urlState.get("value")) {
    document.getElementById("value").value = encodeURIComponent(urlState.get("value"));
  }
}

async function updateData() {

  var cargo = document.getElementById("cargo").value;
  var variable = document.querySelector('input[name="variable"]:checked').value;
  var value = decodeURIComponent(document.getElementById("value").value);
  var max_distance_km = parseInt(document.getElementById("max_distance_km").value);

  const urlState = new URLSearchParams(window.location.search);
  urlState.set("cargo", cargo);
  urlState.set("variable", variable);
  urlState.set("value", value);
  urlState.set("max_distance_km", max_distance_km);
  window.history.replaceState({}, "Russia runs on rail", `${window.location.pathname}?${urlState.toString()}`);

  flows = await querySeafowl(`
    select distinct
        f.origin_station_id,
        f.destination_station_id,
        f.variable,
        f.volume_kg,
        o.lat as origin_station_lat,
        o.lon as origin_station_lon,
        d.lat as destination_station_lat,
        d.lon as destination_station_lon
    from (
      select
          "Код станции отправления РФ" as origin_station_id,
          "Код станции назначения РФ" as destination_station_id,
          "${variable}" as variable,
          sum("Объем перевозок, кг") as volume_kg
      from app.flows
      where "Подгруппа груза" = '${cargo}'
      and "${variable}" = '${value}'
      group by 1, 2, 3) as f
    left join app.stations as o
    on f.origin_station_id = left(o.id, 5)::numeric
    left join app.stations as d
    on f.destination_station_id = left(d.id, 5)::numeric
    where o.lat is not null
    and o.lon is not null
    and d.lat is not null
    and d.lon is not null
    order by f.volume_kg desc
  `);

  routes = ({
    type: "FeatureCollection",
    features: flows
      .map(f =>
        turf.lineString([
          [ f.origin_station_lon, f.origin_station_lat ],
          [ f.destination_station_lon, f.destination_station_lat ]
        ], f)
      )
  });

  origins = ({
    type: "FeatureCollection",
    features: flows
      .map(f => turf.point([
        f.origin_station_lon,
        f.origin_station_lat
      ], f))
  });

  destinations = ({
    type: "FeatureCollection",
    features: flows
      .map(f => turf.point([
        f.destination_station_lon,
        f.destination_station_lat
      ], f))
  });

  military_points_nearby = turf.pointsWithinPolygon(
    ({
      type: "FeatureCollection",
      features: military_points.features.filter(d => {
        return cargo === "КЕРОСИН" ?
        d.properties.Name.toLowerCase().match("air base") :
        true
      })
    }),
    destinations.features
      .map(d => turf.buffer(d, max_distance_km, { units: "miles" }))
      .reduce((a, b) => turf.union(a, b))
  );

  refinery_points_nearby = turf.pointsWithinPolygon(
    refinery_points,
    origins.features
      .map(d => turf.buffer(d, max_distance_km, { units: "miles" }))
      .reduce((a, b) => turf.union(a, b))
  );
}

function updateMap() {

  const layers = ["routes", "destinations", "military", "refineries", "gpt"];
  layers.forEach(d => map.getLayer(d) ? map.removeLayer(d) : null);
  layers.forEach(d => map.getSource(d) ? map.removeSource(d) : null);
  document.getElementById("rationale").innerHTML = "";

  map.addSource("routes", {
    type: "geojson",
    data: routes
  });

  map.addLayer({
    id: "routes",
    source: "routes",
    type: "line",
    paint: {
      "line-color": "#aaa",
      "line-width": ["/", ["get", "volume_kg"], 4e6]
    },
    layout: {
      "line-cap": "round"
    }
  });

  map.addSource("military", {
    type: "geojson",
    data: military_points_nearby
  });

  map.addLayer({
    id: "military",
    source: "military",
    type: "circle",
    paint: {
      "circle-color": "#0ff",
      "circle-radius": 5
    }
  });

  map.addSource("refineries", {
    type: "geojson",
    data: refinery_points_nearby
  });

  map.addLayer({
    id: "refineries",
    source: "refineries",
    type: "circle",
    paint: {
      "circle-color": "#ff0",
      "circle-radius": 5
    }
  });

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  ["military", "refineries"].forEach(layer => {
    map.on("mouseenter", layer, (e) => {
      map.getCanvas().style.cursor = "pointer";

      const coordinates = e.features[0].geometry.coordinates.slice();
      const name = e.features[0].properties.Name;

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      popup.setLngLat(coordinates).setHTML(name).addTo(map);
    });

    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
  });
  
  map.on("mouseenter", "routes", (e) => {
    map.getCanvas().style.cursor = "pointer";

    const coordinates = turf.centroid(e.features[0].geometry).geometry.coordinates;
    const volume_kg = e.features[0].properties.volume_kg;

    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    popup.setLngLat(coordinates).setHTML(`${d3.format(",.2s")(volume_kg / 1e3)}t`).addTo(map);
  });

  map.on("mouseleave", "routes", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  const bounds = turf.bbox(routes);
  map.fitBounds(bounds, { maxZoom: 14 });
}

var flows;
var routes;
var origins;
var destinations;
var military_points_nearby;
var refinery_points_nearby;

mapboxgl.accessToken = "pk.eyJ1IjoiZGF0YS1kZXNrIiwiYSI6ImNsYmNlcjl4bjBjd3UzcG55dHluaHYzbmQifQ.2wVVsUzF2BHBJ9ywCxCqWw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/data-desk/clfgqt6cb00kv01mr4hi8go7e",
  center: [73, 61],
  zoom: 3
});

var refinery_points = await d3.json("data/refineries.json")
  .then(refineries => ({
    type: "FeatureCollection",
    features: [...refineries.features,
      {
        type: "Feature",
        properties: {
          Name: "Omsk Refinery (Gazprom Neft PJSC)"
        },
        geometry: {
          type: "Point",
          coordinates: [73.24925446961926, 55.06067402386467]
        }
      }]
      .map(d => ({
        type: d.type,
        geometry: d.geometry,
        properties: {
          Name: d.properties.Name.replace(/\(.*\)/g, "")
        }
      }))
    })
  );

var military_points = await d3.json("data/military.json")
  .then(military => ({
    type: "FeatureCollection",
    features: Object.values(military).flat().map(d => ({
      type: "Feature",
      properties: {
        Name: d.title
      },
      geometry: {
        type: "Point",
        coordinates: [parseFloat(d.lng), parseFloat(d.lat)]
      }
    }))
  }));

map.on("render", () => {
  updateReadout();
});
  
map.on("move", () => {
  updateReadout();
});

document.getElementById("cargo").addEventListener("change", async () => {
  await update();
  await updateData();
  await updateMap();
});

document.getElementsByName("variable")
  .forEach(element => element.addEventListener("change", async () => {
    await updateValues();
    await updateData();
    await updateMap();
  })
);

document.getElementsByName("targets")
  .forEach(element => element.addEventListener("change", async () => {
    await updateData();
    await updateMap();
  })
);

document.getElementById("value").addEventListener("change", async () => {
  await updateData();
  await updateMap();
});

document.getElementById("max_distance_km").addEventListener("change", async () => {
  await updateData();
  await updateMap();
});

[document.getElementById("about-link"), document.getElementById("about-close")].forEach(link =>
  link.addEventListener("click", async () => {
    document.getElementById("about").style.visibility = (document.getElementById("about").style.visibility === "hidden" ? "visible" : "hidden");
  })
);

/*document.getElementById("ask-gpt").addEventListener("click", async () => { await askGPT() } );*/

var cargo = document.getElementById("cargo").value;
var variable = "Станция отправления РФ";
var value = decodeURIComponent(document.getElementById("value").value);
var max_distance_km = parseInt(document.getElementById("max_distance_km").value);

const urlState = new URLSearchParams(window.location.search);

if(!urlState.has("cargo")) {
  document.getElementById("about").style.visibility = "visible";
} else {
  document.getElementById("about").style.visibility = "hidden";
}

document.getElementById("cargo").value = urlState.get("cargo") || "КЕРОСИН";
if(urlState.get("variable") === "Станция назначения РФ") {
  document.getElementById("destination-station").checked = true;
} else {
  document.getElementById("origin-station").checked = true;
}
document.getElementById("max_distance_km").value = urlState.get("max_distance_km") || 3;

await updateValues();
await updateData();
await updateMap();
