# Russia runs on rail

This repository hosts a [GitHub Pages site](https://data-desk-eco.github.io/HapqfBfspHJDfFnEfjRpHmztCoRsbsypiojRmbfP/) serving an interactive web app called 'Russia runs on rail' (R3). The app — which provides an interactive map of flows of refined petroleum products in Russia — was designed as a proof of concept by [Data Desk](https://datadesk.eco/), with sponsorship from [Splitgraph](https://www.splitgraph.com/) and data provided by the [Anti-Corruption Data Collective](https://acdatacollective.org/) (ACDC).

## Data sources

|Name|Source|
|----|------|
|Russian rail freight dispatch data|[RZD](https://eng.rzd.ru) via the Anti-Corruption Data Collective|
|Locations of Russian military forces|[Georgian Foundation for Strategic and International Studies](https://gfsis.org.ge/) (GFSIS)|
|Locations of Russian oil refineries|[Refinitiv](https://www.refinitiv.com/en/products/refinitiv-workspace)|

## What is it for?

This project serves three purposes:

  1. To provide journalists and academic researchers working on accountability for Russia's invasion of Ukraine with a high-level picture of how flows of refined petroleum products — principally petrol, diesel and jet fuel — have enabled the war effort.

  2. To encourage those same journalists and researchers to make contact with ACDC and other groups already working on this topic, with the ultimate aim of boosting the impact of that work through co-ordination and sharing of information.
    
  3. To demonstrate the applicability of Splitgraph's technology to this type of technical use case.

  4. To explore the potential use of analytical databases like Seafowl in conjunction with large language models (LLMs) like OpenAI's GPT-4 for assistance with investigative research.

## How does it work from a user perspective?

Users can query a subset of rail freight dispatch data derived from [Russian Railways](https://eng.rzd.ru) (RZD), covering shipments of petrol, diesel and jet fuel in the year 2022. The data can be grouped by origin station or destination station and the respective counterpart stations visualised on an interactive map. Refineries near origin stations and military infrastructure near destination stations are automatically highlighted, based on geospatial intersection queries.

## How does it work from a technical perspective?

The R3 map is powered primarily by [Seafowl](https://seafowl.io/), an analytical database designed for modern, data-driven web applications, based on [Apache Arrow DataFusion](https://arrow.apache.org/datafusion/).

As [Splitgraph recommends](https://seafowl.io/docs/guides/baking-dataset-docker-image) for smaller data sets, data is baked into a custom Docker image alongside the Seafowl binary. The Dockerfile for this image is generated automatically by the script `schema.sh`, which looks in a specified Google Cloud Storage bucket for Parquet files and generates a [remote table](https://seafowl.io/docs/guides/remote-tables) in Seafowl for each one. For portability's sake, the Dockerfile then imports each of these tables into the image, but they could just as well be left as remote tables and queried in-place.

The `depoy.yml` workflow in this repository uses GitHub Actions to build and deploy the image using [Fly](https://fly.io/), a flexible and relatively low-cost host for Docker images. Once deployed, Seafowl serves up an HTTPS endpoint that can be queried using a subset of the PostgreSQL syntax. The Seafowl model has a number of features that make it ideal for this use case:

  1. Data can be deployed for querying with a minimum of extraction, transformation and loading (ETL), allowing analysts to focus on value-added journalisic/investigative work. In this case, we take a large number of Russian CSV files, remove irrelevant columns, then stack them on top of each other row-wise without any further processing or aggregation.

  2. Seafowl's intelligent use of local and server-side caches transforms the 'economy' of querying, making any repeated queries essentially free. This fits perfectly with the model of an interactive web app aimed at investigative journalists, where the user is likely to identify and then return to specific queries multiple times.

  3. Accepting queries over HTTPS means that Seafowl can power seemingly complex web apps with minimal or no dependencies. In this specific case, the app relies on [D3](https://d3js.org/), [Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/) and [Turf](https://turfjs.org/) for its visual components, but doesn't require something like [Postgres.js](https://github.com/porsager/postgres) too.

At present, creation of the Dockerfile using `schema.sh` is done manually as and when required, but this could easily be automated as part of the GitHub Action workflow, creating a seamless process.

## Obligatory AI magic 🪄

In addition to making use of Seafowl, the R3 map uses the OpenAI API to request analysis of the results it has returned, using GPT-4 to surface what it thinks might be particularly interesting or relevant flows from the large general pool of point-to-point petroleum product shipments. The GPT-4 component works as follows:

  1. When a user clicks the "AI ASSIST (GPT-4)" button, the app sends the current state to OpenAI in summarised form, giving the cargo shipped, either the origin or the destination station as a latitude/longitude point, the equivalent points for all counterpart stations, and the volume transported between each pair of stations. It also sends a 'system' prompt giving GPT-4 some context about the conflict and instructions on how to respond.

  2. GPT-4 selects between one and three 'interesting' flows and sends them back in a pre-defined JSON format, allowing them to be highlighted on the map. What makes a flow interesting is largely left to GPT-4 to decide, but early testing suggests that it has a very good understanding of geographic locations (including interpreting latitude/longitude points) and their implications, e.g. proximity to military infrastructure, ports, etc.
