var express = require("express"),
    _ = require("underscore"),
    config = require("./package.json").config,
    app = express(),
    exec = require("child_process").exec,
    fs = require("fs"),
    request = require("request"),
    read = require("fs").readFileSync,
    write = require("fs").writeFileSync,
    crypto = require("crypto");

// setting up jade
app.set("views",__dirname+"/views");
app.set("view engine","jade");
app.use(express.static(__dirname+"/public"));
app.use(express.basicAuth('public','public'));

app.listen(config.port,function(){
    console.log("Listening on port " + config.port);
});

// govern output
if(config.debug){
    app.use(express.logger("dev"));
}


////////////

app.get("/", function(req, res){
    res.render("unauth");
});
app.get("/auth/keygen", function(req,res){
    var randstr = Math.random().toString(36).substring(2,7);
    res.render("json",{data:{key:randstr}});
});
app.get("/ircsim/:nick/:key", function(req,res){
    var nick = req.params.nick;
    var key = req.params.key;

    var currentKeys = JSON.parse(read("./data//authkeys.json","utf-8"));
    currentKeys[key] = nick;
    write("./data/authkeys.json",JSON.stringify(currentKeys,null,'    '));
    res.render("json",{data:currentKeys});
});
app.get("/auth/accepted/:key", function(req,res){
    var currentKeys = JSON.parse(read("./data/authkeys.json","utf-8"));
    if(currentKeys[req.params.key]){
        var output = {"key": req.params.key, "username": currentKeys[req.params.key]};
        output["hash"] = crypto.createHash('sha1').update(config.secret + req.params.key).digest("hex")
        res.render("json",{data:output});
    } else {
        res.render("json",{data:"Not found"});
    }
});
app.get("/overview", function(req,res){
    res.render("overview");
});
app.get("/raw", function(req,res){
    exec("deluge-console info", function(err, stdout, stderr){
        res.render("raw", {err:err,stdout:stdout,stderr:stderr});
    });
});
app.get("/action/:id/:action", function(req, res){
    var whitelist = ["resume","pause"];
    var id = req.params.id;
    var action = req.params.action;
    if(_.indexOf(whitelist,action) != "-1"){
        if(id.replace(/[0-9a-f]{40}/,'')==""){
            exec("deluge-console resume \"" + id + '"', function(err, stdout, stderr){
                res.render("raw", {err:err,stdout:stdout,stderr:stderr});
            });
        } else {
            res.send(400,"Invalid ID");
        }
    } else {
        res.send(400,"Invalid action");
    }
});
app.get("/status", function(req, res){
    exec("deluge-console info", function(err, stdout, stderr) {
        stdout = stdout + "\n "; // dirty hack to make the last one display
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
                        } else if (~subline.indexOf("iso")){
                            working["quality"] = ".iso";
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
                        working["days-seeding"] = subline.split(" ")[0]; 
                        working["time-active"] = subline.substr(subline.indexOf(" Active ") + 8);
                        working["days-active"] = working["time-active"].split(" ")[0];
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
                    case "Tracker status":
                        var split = subline.split(" ");
                        working["tracker"] = split.shift();
                        working["tracker-status"] = split.join(" ");
                        delete working["Tracker status"];

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
        try{
        var data = JSON.parse(body);
        } catch(e) {
            var data ="";
        }

        res.render("json",{data:data});
    });
});
app.get("/rxb", function(req, res){
    res.render("rxb");
});
app.get("/rxb/data", function(req, res){
    fs.readFile('/sys/class/net/eth0/statistics/rx_bytes','utf8', function(err,rxb){
        fs.readFile('/sys/class/net/eth0/statistics/tx_bytes', 'utf8', function(err2, txb){
            console.log(rxb);
            var data = {rxb:rxb,txb:txb};
            res.render("json",{data:data});
        });
    });
});
app.use(function(req, res) {
    res.status(404).render('error', {code:404});
});
