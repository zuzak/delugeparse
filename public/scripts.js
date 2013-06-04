$(document).ready(function() {
    $('.loading span').text("Loading...");
    update();
});
function resume(id){
    $("#" + id + " .resume").fadeOut();
    $.get("action/" + id + "/resume");
    $("#" + id + " .activity").text("Resuming…");
}
function pause(id){
    $("#" + id + " .resume").fadeOut();
    $.get("action/" + id + "/pause");
    $("#" + id + " .activity").text("Pausing…");
}
    
function update(){
    $('.loading span').text("Contacting client...");
    $.get("status", function(json){
        $('.loading span').text("Parsing information...");
        var data = JSON.parse(json), longstr = "";
        $(".activity").text("removed").addClass("removed");
        $(".box").addClass("removedtorrent");
        $.each(data, function(index, torrent){
            var box = ".box#" + torrent.ID;
            if($(box).length == 0){
                var str = '<div class="box" id="' + torrent.ID + '">';
                str += '<span class="status activity"></span>';
                str += '<a class="status resume paused">▸</a>';
                str += '<span class="status seeding trackseed"></span>';
                str += '<h3></h3>';
                str += '<div class="progress">';
                str += '<div class="progress-inner"></div>';
                str += '<span></span></div><span class="';
                str += 'status ratio"></span><span class="status quality">';
                str += '</span><span class="info"><span class="peers"></span>';
                str += '<span class="stalled"></span></span>';
                str += '<a href="https://ranna.chippy.ch/' + torrent.name;
                str += '" class="status dl">Download</a><div class="imdb"></div></div>';
                $('#boxen').append(str);

                $.get("imdb/" + clearWord(torrent.name), function(imdbjson){
                    try {
                        var imdb = JSON.parse(imdbjson)[0];
                        if(imdb.rating){
                            var subtitle;
                            if(imdb.actors[0] == imdb.directors[0]){
                                subtitle = "Starring and directed by " + imdb.actors[0];
                            } else {
                                subtitle = "Starring " + imdb.actors[0];
                                subtitle += " · Directed by " + imdb.directors[0];
                            }
                            subtitle += " · " + imdb.rating + " stars";
                            $(box + " .imdb").text(subtitle).fadeIn();
                        }
                    } catch (e) {
                        // ohai
                    }
                });

                $('.activity').attr("title", "Current activity");
                $('.activity.inverse').attr("title", "Current activity (using bandwidth)");
                $('.progress-inner').attr("title", "Downloaded size");
                $('.progress').attr("title", "Total size");
                $('.ratio').attr("title", "Ratio");
                $('.quality').attr("title", "Quality");
                $(box+" h3").text(clearWord(torrent.name));
            }
            $(box).removeClass("removedtorrent");

                if(torrent.tracker != "tehconnection.eu"){
                    $(box + ' .trackseed').text(torrent.tracker).fadeIn().attr("title","Public tracker");
                }

            if(torrent["traffic"]){
                $(box+" .activity").addClass("inverse");
            } else {
                $(box+" .activity").removeClass("inverse");
            }
            $(box+" .activity").addClass(torrent["status"]);
            $(box+" .activity").text(torrent["status"]);
            if(torrent["status"] == "checking"){
                if(torrent["size-downloaded"] == "0.0KiB"){
                    $(box+" .activity").text("waiting"); // (for check)
                } else {
                    $(box+" .activity").text(torrent["status"]).addClass("inverse");
                }
            } else if (torrent.tracker == "tehconnection.eu" && torrent["status"] == "seeding"){
                if((torrent["days-seeding"] > 3 && torrent.tracker == "tehconnection.eu") || torrent.tracker != "tehconnection.eu"){
                    $(box + " .trackseed").text("\u2713").fadeIn();
                    $(box + ' .trackseed').attr("title", "Tracker obligations fulfilled");
                }
                // $(box+" .activity").text("seeding " + torrent["days-seeding"] + "d");
            }
            if (torrent.status == "paused") {
                $(box + " .resume").attr("href","javascript:resume('" + torrent.ID + "');");
                $(box + " .resume").fadeIn();
            } else {
                $(box + " .resume").fadeOut();
            }
            $(box+" .activity").removeClass("seeding removed downloading paused active queued checking error");
            $(box+" .trackseed").removeClass("seeding removed downloading paused active queued checking error");
            $(box+" .activity").addClass(torrent["status"]);
            if(!torrent.progress){
                if(torrent["size-downloaded"] == torrent["size-total"]){
                    torrent.progress = "100%";
                } else {
                    var dl = parseFloat(torrent["size-downloaded"].substring(0, torrent["size-downloaded"].length -3));
                    var tl = parseFloat(torrent["size-total"].substring(0, torrent["size-total"].length -3));
                    torrent.progress = (dl/tl)*100; }
            }

            $(box+" .progress-inner").css("width",torrent.progress);
            $(box+" .progress-inner").text(torrent["size-downloaded"]);
            $(box+" .progress span").text(torrent["size-total"]);
            if(torrent.ratio <= 1){
                $(box + " .ratio").addClass("inverse");
            } else {
                $(box + " .ratio").removeClass("inverse");
            }
            if(torrent.ratio == "-1.000"){
                torrent.ratio = "\u221E";
            } else {
                torrent.ratio = parseFloat(torrent.ratio).toFixed(2);
            }
            $(box + " .ratio").html(torrent.ratio);
            if(torrent.quality){
                $(box + ' .quality').text(torrent.quality);
            } else {
                $(box + ' .quality').hide();
            }
            var peers = "";
            if(torrent["tracker-status"] != "Announce OK"){
                peers = "[" + torrent["tracker-status"] + "]";
            }
                if(torrent["seeders-total"]!=undefined){
                    if(peers != ""){peers += " · ";}
                    peers += torrent["seeders-connected"] + " / " + torrent["seeders-total"];
                    peers += " seeders · " + torrent["peers-connected"] + " / " + torrent["peers-total"];
                    peers += " leechers"; 
                }
                if(torrent.status == "seeding"){
                    if(torrent["days-seeding"] != 0){
                        if(peers != ""){peers += " · ";}
                        peers += "seeded for " + torrent["days-seeding"] + " day";
                        if(torrent["days-seeding"] != 1){ peers += "s";}
                    }
                } else { 
                    if(torrent["days-active"] != 0){
                        if(peers != ""){peers += " · ";}
                        peers += "active for " + torrent["days-active"] + " day";
                        if(torrent["days-active"] != 1){ peers += "s";}
                    }
                }
            $(box + ' .peers').text(peers);
           
            var stall = "";
            if(torrent["seeders-total"] == 0 && torrent["status"] == "downloading"){
                if(torrent["peers-total"]==1){
                    stall = "stalled!";
                } else {
                    stall = "dead?";
                }
            }
            $(box + " .stalled").text(stall)

            if(torrent["size-total"] == torrent["size-downloaded"]){
                $(box + " .dl").fadeIn();
            } else {
                $(box + " .dl").fadeOut();
            }
            
        });
        $('.loading').hide(function(){
            $('#boxen').fadeIn();
        });
        setTimeout(update,2000);
    });
}
function clearWord(str){
 //   str = str.replace(/\d{4}(?!p).*/,'');
    str = str.replace(/\d{4}.*/,'');
    str = str.replace(/\(|\)|\.|\[|\]|\-|mkv/g,' ');


    // https://gist.github.com/mattwiebe/1005915
    
    str = str.replace(/([a-z])([A-Z])/g, '$1 $2');
    str = str.replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3');

    return str;
}

