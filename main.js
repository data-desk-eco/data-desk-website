import * as Plot from "https://cdn.skypack.dev/@observablehq/plot@0.6";
import * as d3 from "https://cdn.skypack.dev/d3";

const chart_width = 200;
const chart_height = 160; 
const data = await d3.csv(
  "https://static.observableusercontent.com/files/322b57078cd28aa9ad039c6c1cc6ddc3bf1a140b406ee66e78996d50073e36d97505007c3d7c453399d65ffd68a6cb72f0770069b3de5bee1d9ffb8895c54529?response-content-disposition=attachment;filename*=UTF-8''data%401.csv",
  d => ({
    ...d,
    date: new Date(d.date),
    value: parseInt(d.value)
  })
);

function lineChart(data, variable, years, title) {
  return Plot.plot({
    marks: [
      Plot.text([title], { frameAnchor: "top" }),
      Plot.lineY(
        data.filter(d =>
          d.variable === variable &&
          d.date >= d3.utcYear.offset(new Date(), -years)
        ),
        { x: "date", y: "value", curve: "catmull-rom" }
      ),
    ],
    y: {
      label: null,
      tickFormat: d3.format(",.2s"),
      domain: [
        d3.min(data.filter(d => d.variable === variable), v => v.value),
        d3.max(data.filter(d => d.variable === variable), v => v.value) +
        d3.max(data.filter(d => d.variable === variable), v => v.value) * .2
      ]
    },
    width: chart_width,
    height: chart_height,
    style: {
      background: "black",
      color: "white"
    }
  })
}

function bigNumber(data, variable, title) {
  return Plot.plot({
    marks: [
      Plot.text([title], {
        frameAnchor: "top"
      }),
      Plot.text([Math.round(data.find(d => d.variable === variable).value)], {
        frameAnchor: "bottom",
        fontSize: 60,
      })
    ],
    width: chart_width,
    height: chart_height - 70,
    style: {
      background: "black",
      color: "white"
    }
  })
}

/*document
  .querySelector("#charts")
  .appendChild(
    lineChart(data, "Alternative data", 10, "Searches for \"alternative data\"")
  );
document
  .querySelector("#charts")
  .appendChild(
    lineChart(data, "Breached accounts", 10, "Web accounts breached")
  );
document
  .querySelector("#charts")
  .appendChild(
    bigNumber(data, "MapBiomas alerts", "Rate of deforestation in Brazil (ha/day)")
  );
document
  .querySelector("#charts")
  .appendChild(
    lineChart(data, "UK renewables vs. nuclear", 1, "UK grid: renewables vs. nuclear")
  );*/

function updateEdges() {

  Array.from(document.querySelectorAll("#visual img"))
    .map(e => e.id)
    .forEach(id => {
      var left = document.querySelector(`#${id}-text h2 span.title`).getBoundingClientRect().right;
      var right = document.querySelector(`#${id}`).getBoundingClientRect().left - 10;
      var bottom = document.querySelector(`#${id}-text h2 span.title`).getBoundingClientRect().bottom - 5; 
      var top = document.querySelector(`#${id}`).getBoundingClientRect().top;
      var width = right - left;
      var height = top - bottom;
      var hypotenuse = Math.sqrt(width * width + height * height);
      var angle = (Math.atan(height / width) * 180 / Math.PI);

      document.querySelector(`#${id}-text div.edge`).style.position = "absolute";
      document.querySelector(`#${id}-text div.edge`).style.left = `${left}px`;
      document.querySelector(`#${id}-text div.edge`).style.top = `${bottom}px`;
      document.querySelector(`#${id}-text div.edge`).style.width = `${hypotenuse}px`;
      document.querySelector(`#${id}-text div.edge`).style.transform = `rotate(${angle}deg)`;
    });
   
}

setInterval(updateEdges, 20);  
