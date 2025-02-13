var express = require("express");
var exphbs = require("express-handlebars");
var fs = require("fs");

var PORT = 3000;
var app = express();

app.engine("handlebars", exphbs.engine({ defaultLayout: "main"}));
app.set("view engine", "handlebars");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let userData = "./user-data.json";

app.get("/", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    let user_catalogs = {...file_json_data.catalogs.movies, ...file_json_data.catalogs.tv_shows};
    res.render("homePage", {
        catalogs: user_catalogs
    });
});

app.get("/movies", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    res.render("homePage", {
        catalogs: file_json_data.catalogs.movies,
        type: "movies"
    });
});

app.get("/tv_shows", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    res.render("homePage", {
        catalogs: file_json_data.catalogs.tv_shows,
        type: "tv_shows"
    });
});

app.get("/add-catalog", function(req, res) {
    res.render("new-catalog");
});

app.get("/add-catalog/:type", function(req, res) {
    res.render("new-catalog", {
        type: req.params.type
    });
});

app.get("/add-listing/:type/:parent", function(req, res) {  
    res.render("new-listing", {
        type: req.params.type,
        parent: req.params.parent
    });
});

app.post("/add-catalog-submit", function(req, res) {
    let newCatalog = {
        "name": req.body.catalog_name,
        "type": req.body.catalog_type,
        "is_ranked": req.body.is_ranked,
        "listings": {}
    }

    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    if(req.body.catalog_type === "movies"){
        file_json_data.catalogs.movies.push(newCatalog);
    }
    else {
        file_json_data.catalogs.tv_shows.push(newCatalog);
    }
    fs.writeFileSync(userData, JSON.stringify(file_json_data));
    res.redirect('/');
});

app.post("/add-listing-submit", function(req, res) {
    let newListing = {
        "type": req.body.media_type,
        "parent": req.body.parent,
        "title": req.body.title,
        "director": req.body.made_by,
        "is_watched": req.body.is_watched,
        "rank": req.body.given_rank,
        "notes": req.body.notes
    }

    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    let catalogs = file_json_data.catalogs[`${req.body.media_type}`];
    catalogs.forEach(catalog => {
        if(catalog.name === req.body.parent) {
            catalog.listings[`${req.body.title}`] = newListing;
        }
    });
    fs.writeFileSync(userData, JSON.stringify(file_json_data));
    res.redirect(`/catalogs/${req.body.media_type}/${req.body.parent}`);
});

app.get("/listings/:type/:parent/:title", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    let to_search;
    let listing_found;

    let catalogs = file_json_data.catalogs[`${req.params.type}`];
    catalogs.forEach(catalog => {
        if(catalog.name === req.params.parent) {
            to_search = catalog.listings;
        }
    });

    listing_found = to_search[`${req.params.title}`];

    if(listing_found) {
        res.render("piece-of-media", {
            type: listing_found.type,
            parent: listing_found.parent,
            title: listing_found.title,
            director: listing_found.director,
            is_watched: listing_found.is_watched,
            rank: listing_found.rank,
            notes: listing_found.notes
        });
    }
    else {
        console.error("parent catalog or listing not found")
    }
});

app.get("/catalogs/:type/:name", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    let catalog_found;

    let catalogs = file_json_data.catalogs[`${req.params.type}`];
    
    if(catalogs) {
        catalogs.forEach(catalog => {
            if(catalog.name === req.params.name) {
                catalog_found = catalog;
            }
        });
    }    
    
    if(!catalog_found) {
        console.error(`catalog ${req.params.type}: ${req.params.name} was not found`);
    }
    else {
        res.render("catalog-page", {
            "name": catalog_found.name,
            "type": catalog_found.type,
            "is_ranked": catalog_found.is_ranked,
            "listings": catalog_found.listings
        });
    }
});

app.post("/listings/delete/confirm", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    let catalogs = file_json_data.catalogs[`${req.body.media_type}`];
    catalogs.forEach(catalog => {
        if(catalog.name === req.body.parent) {
            let listings_list = catalog.listings;
            try {
                delete listings_list[`${req.body.title}`];
                fs.writeFileSync(userData, JSON.stringify(file_json_data));
            } catch (error) {
                console.error(`could not delete ${req.body.title} from catalog ${req.body.media_type}: ${req.body.parent}`);
            }
        }
    });
    res.redirect(`/catalogs/${req.body.media_type}/${req.body.parent}`);
});

app.post("/catalogs/delete/confirm", function(req, res) {
    let file_data = fs.readFileSync(userData);
    let file_json_data = JSON.parse(file_data);
    let catalogs = file_json_data.catalogs[`${req.body.media_type}`];
    let catalog_found = false;
    catalogs.forEach((catalog, idx) => {
        if(catalog.name === req.body.name) {
            catalog_found = true
            catalogs.splice(idx, 1);
            fs.writeFileSync(userData, JSON.stringify(file_json_data));
        }
    });
    if(!catalog_found) {
        console.error(`could not delete catalog ${req.body.media_type}: ${req.body.name}`)
    }
    res.redirect("/");
});

app.listen(PORT, function (err) {
    if(err) console.error(err);
    console.log("Server listening on port", PORT, "...");
});