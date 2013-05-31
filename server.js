var express = require("express"),
    _ = require("underscore"),
    config = require("./package.json").config,
    app = express(),
    exec = require("child_process").exec,
    request = require("request");

app.set("views",__dirname+"/views");
app.set("view engine","jade");
app.use(express.static(__dirname+"/public"));
app.use(express.basicAuth('public','public'));

if(config.debug){
    app.use(express.logger("dev"));
}

app.listen(config.port);

////////////

app.get("/", function(req,res){
    res.render("index");
});
app.get("/status", function(req, res){
    exec("deluge-console info", function(err, stdout, stderr) {
        var data = [], working = {}, pointer = -1;
        stdout = stdout.split("\n");
        for(var curr in stdout){
            var line = stdout[curr];
            if(line!=" "){
                var subline = line.split(": ");
                var key = subline.shift();
                subline = subline.join(" ");
                working[key] = subline;
                switch(key){
                    case "Name":
                        if(~subline.indexOf("1080p")){
                            working["quality"] = "1080p";
                        } else if (~subline.indexOf("720")){
                            working["quality"] = "720p";
                       }
                        working["name"] = working["Name"];
                        delete working["Name"];
                        break;
                    case "Size":
                        var split = subline.split(" ");
                        working["size-downloaded"] = split[0] + split[1].substr(0,split[1].indexOf("/"));
                        working["size-total"] = split[1].substr(split[1].indexOf("/")+1) + split[2];
                        working["ratio"] = split[4];
                        delete working.Size;
                        break;
                    case "Seed time":
                        working["time-seeding"] = subline.substr(0,subline.indexOf(" Active "));
                        working["time-active"] = subline.substr(subline.indexOf(" Active ") + 8);
                        delete working["Seed time"];
                        break;
                    case "Progress":
                        working["progress"] = subline.substr(0,subline.indexOf("%")+1);
                        delete working["Progress"];
                        break;
                    case "Seeds":
                        var split = subline.split(" ");
                        working["seeders-connected"] = split[0];
                        working["seeders-total"] = split[1].replace(/\(|\)/g,"");
                        working["peers-connected"] = split[3];
                        working["peers-total"] = split[4].replace(/\(|\)/g,"");
                        delete working["Seeds"];
                        break;
                    case "State":
                        var split = subline.split(" ");
                        working["status"] = split[0].toLowerCase();
                        working["traffic"] = false;
                        if(subline.indexOf("Up Speed 0.0 KiB/s")==-1&&subline.indexOf("Up Speed")!=-1){
                            working["traffic"] = true;
                        } else if(subline.indexOf("Down Speed 0.0 KiB/s")==-1&&subline.indexOf("Down Speed")!=-1){
                            working["traffic"] = true;
                        }
                        delete working["State"];
                        break;

                }
            } else {
                data[pointer] = working;
                working = {};
                pointer++;
            }
        }
        res.render("json",{data:data});
    });
});
app.get("/imdb/:film", function(req, res){
    request.get("http://imdbapi.org/?q=" + req.params.film, function(error, response, body){
        var data = JSON.parse(body);
        res.render("json",{data:data});
    });
});
