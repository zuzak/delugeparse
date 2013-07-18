var express = require("express"),
    _ = require("underscore"),
    config = require("./package.json").config,
    app = express(),
    exec = require("child_process").exec,
    fs = require("fs"),
    request = require("request"),
    read = require("fs").readFileSync,
    write = require("fs").writeFileSync,
    crypto = require("crypto"),
    irc = require("irc"),
    log = require("log-colors"),
    passport = require("passport"),
    LocalStrategy = require("passport-local").Strategy,
    mongoose = require("mongoose"),
    ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

// setting up jade
app.set("views",__dirname+"/views");
app.set("view engine","jade");
app.use(express.static(__dirname+"/public"));
//app.use(express.basicAuth('public','public'));
app.use(express.bodyParser());


app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: config.secret }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

mongoose.connect("mongodb://localhost/torrents");
var db = mongoose.connection;
db.on('error', function(){
    log.error("Database connection error.");
});
db.once("open", function(){
    log.info("Database connection made.");
});
var userSchema = new mongoose.Schema({
    nick: String,
    slug: String,
    username: String,
    password: String,
    privs: [{priv: String}]
});
var user = mongoose.model('User',userSchema);

// passport
passport.use(new LocalStrategy(
    function(username,password, done){
        user.findOne({
            username: username
        }, function(err, user){
            if(err){
                log.err(err);
                return done(err);
            }
            if(!user){
                log.warn(username + " failed authentication (username)");
                return done(null, false);
            }
            var passhash = crypto.createHash('sha1').update(config.secret + password).digest("hex");
            if(!(passhash == user.password)){
                log.warn(username + " failed authentication (password)");
                return done(null, false);
            }
            log.info(username + " authenticated successfully");
            return done(null, user);
        });
    }
));

passport.serializeUser(function(usr, done) {
  done(null, usr.id);
});

passport.deserializeUser(function(id, done) {
  user.findById(id, function(err, usr) {
    done(err, usr);
  });
});

app.listen(config.web.port,function(){
    log.info("Listening on port " + config.web.port);
});

log.info("Connecting to " + config.irc.server + " as " + config.irc.nick);
var client = new irc.Client(config.irc.server, config.irc.nick, {
    channels: config.irc.channels
});
client.addListener("pm", function(from,message){
    var mesg = message.split(" ");
    if(mesg.length != 2){
        client.say(from,"Invalid command.");
    } else {
        if(mesg[0] == "REGISTER"){
            if(mesg[1].length == 5){
                var currentKeys = JSON.parse(read("./data/authkeys.json","utf-8"));
                currentKeys[mesg[1]] = from;
                write("./data/authkeys.json",JSON.stringify(currentKeys,null,'    '));
                client.say(from,"Authenticated as " + from + ". Return to your browser to continue.");
                log.info(from + " authenticated with key " + mesg[1]);
            } else {
                client.say(from,"Invalid syntax.");
            }
        } else {
            client.say(from,"Unknown command.");
        }
    }
});

app.get("/", function(req, res){
    res.render("unauth");
});

app.get("/auth/keygen", function(req,res){
    var randstr = Math.random().toString(36).substring(2,7);
    res.render("json",{data:{key:randstr}});
});
/* app.get("/ircsim/:nick/:key", function(req,res){
    var nick = req.params.nick;
    var key = req.params.key;

    var currentKeys = JSON.parse(read("./data/authkeys.json","utf-8"));
    currentKeys[key] = nick;
    write("./data/authkeys.json",JSON.stringify(currentKeys,null,'    '));
    res.render("json",{data:currentKeys});
});
app.get("/debug/users", function(req,res){
    res.render("json",{data:JSON.parse(read("./data/users.json","utf-8"))});
}); */
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

app.post("/auth/register", function(req,res){
    var username = req.body.username,
        password = req.body.password,
        hash = req.body.hash,
        slug = req.body.slug;
    if(username&&password&&hash&&slug){
        var hash2 = crypto.createHash('sha1').update(config.secret + slug).digest("hex");
        if(hash == hash2){
            var currentKeys = JSON.parse(read("./data/authkeys.json","utf-8"));
            var nick = currentKeys[slug];
            delete currentKeys[slug];
            write("./data/authkeys.json",JSON.stringify(currentKeys,null,'    '));

            var currentUsers = JSON.parse(read("./data/users.json","utf-8"));
            var passhash = crypto.createHash('sha1').update(config.secret + password).digest("hex");
            var newUser = new user({
                nick: nick,
                slug: slug,
                username: username,
                password: passhash,
                privs: [
                    {priv: "read"}
                ]
            });
            newUser.save(function (err, newUser){
                if(err){
                    log.error("Unable to save user " + username); // TODO: expand
                } else {
                    log.info("New user " + username + " created by " + nick);
                }
            });
            /*
            if(currentUsers[username]){
                res.status(400);
                log.warn("Registration attempted with existing user.");
                res.send("json",{data:{error:"r01",desc:"User already exists."}});
            } else {
                currentUsers[username] = newUser;
                log.info("New user " + username + " created by " + nick);
                write("./data/users.json",JSON.stringify(currentUsers,"utf-8"));
                res.render("json",{data:newUser});
            }
            */
        } else {
            res.status(400);
            res.render("json",{data:{error:"r02",desc:"Invalid hash."}});
            log.warn("Registration attempted with invalid hash.");
        }
    } else {
        res.status(400);
        res.send("json",{data:{error:"r02",desc:"Incorrect number of arguments."}});
    }
});

app.post("/login",
    passport.authenticate("local", {
        successRedirect: "/overview",
        failureRedirect: "/",
        failureFlash: true
    })
);

/* app.get("/overview", function(req,res){
    if(passport.authenticate("local")){
        res.render("overview");
    } else {
        res.render("unauth");
    }
}); */
app.get("/overview", ensureLoggedIn("/"), function(req, res){
    res.render("overview");
});
app.get("/raw", ensureLoggedIn("/"), function(req,res){
    exec("deluge-console info", function(err, stdout, stderr){
        res.render("raw", {err:err,stdout:stdout,stderr:stderr});
    });
});
app.get("/action/:id/:action", ensureLoggedIn("/"), function(req, res){
    var whitelist = ["resume","pause"];
    var id = req.params.id;
    var action = req.params.action;
    if(_.indexOf(whitelist,action) != "-1"){
        if(id.replace(/[0-9a-f]{40}/,'')==""){
            exec("deluge-console resume \"" + id + '"', function(err, stdout, stderr){
                res.render("raw", {err:err,stdout:stdout,stderr:stderr});
                log.info("Stopping " + id);
            });
        } else {
            res.send(400,"Invalid ID");
        }
    } else {
        res.send(400,"Invalid action");
    }
});
app.get("/status", ensureLoggedIn("/"), function(req, res){
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
            var data = {rxb:rxb,txb:txb};
            res.render("json",{data:data});
        });
    });
});
app.use(function(req, res) {
    res.status(404).render('error', {code:404});
});
