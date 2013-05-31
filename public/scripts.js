$(document).ready(function() {
    update();
});
    
function update(){
    $.get("status", function(json){
        var data = JSON.parse(json), longstr = "";
        $.each(data, function(index, torrent){
            var box = ".box#" + torrent.ID;
            if($(box).length == 0){
                var str = '<div class="box" id="' + torrent.ID + '">';
                str += '<span class="status activity"></span><h3>';
                str += '</h3><div class="progress"><div class="progress';
                str += '-inner"></div><span></span></div><span class="';
                str += 'status ratio"></span><span class="status quality">';
                str += '</span><span class="info"><span class="peers"></span>';
                str += '<span class="stalled"></span></span>';
                str += '<a href="' + torrent.name;
                str += '" class="status dl">Download</a><div class="imdb"></div></div>';
                $('#boxen').append(str);

                $.get("imdb/" + clearWord(torrent.name), function(imdbjson){
                    var imdb = JSON.parse(imdbjson)[0];
                    if(imdb.rating){
                    var subtitle = "Starring " + imdb.actors[0];
                    subtitle += " · Directed by " + imdb.directors[0];
                    subtitle += " · " + imdb.rating + " stars";
                    $(box + " .imdb").text(subtitle).fadeIn();
                    }
                });

            }
            $(box+" h3").text(clearWord(torrent.name));
            if(torrent["traffic"]){
                $(box+" .activity").addClass("inverse");
            } else {
                $(box+" .activity").removeClass("inverse");
            }
            $(box+".activity").addClass(torrent["status"]);
            $(box+" .activity").text(torrent["status"]);
            $(box+" .activity").removeClass("seeding downloading paused active queued checking error");
            $(box+" .activity").addClass(torrent["status"]);
            if(!torrent.progress){torrent.progress="100%";}
            $(box+" .progress-inner").css("width",torrent.progress);
            $(box+" .progress-inner").text(torrent["size-downloaded"]);
            $(box+" .progress span").text(torrent["size-total"]);
            if(torrent.ratio <= 1){
                $(box + " .ratio").addClass("inverse");
            } else {
                $(box + " .ratio").removeClass("inverse");
            }
            if(torrent.ratio == "-1.000"){
                torrent.ratio = "&nbsp;ø&nbsp;";
            } else {
                torrent.ratio = parseFloat(torrent.ratio).toFixed(2);
            }
            $(box + " .ratio").html(torrent.ratio);
            if(torrent.quality){
                $(box + ' .quality').text(torrent.quality);
            } else {
                $(box + ' .quality').hide();
            }
            if(torrent["seeders-total"]!=undefined){
                var peers = torrent["seeders-connected"] + " / " + torrent["seeders-total"];
                peers += " seeders · " + torrent["peers-connected"] + " / " + torrent["peers-total"];
                peers += " leechers"; 
                $(box + ' .peers').text(peers);
            }
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
            };
            
        });
        $('.loading').hide(function(){
            $('#boxen').fadeIn();
        });
        setTimeout(update,2000);
    });
}
function clearWord(str){
    str = str.replace(/\d{4}(?!p).*/,'');
    str = str.replace(/\(|\)|\.|\[|\]|\-/g,' ');
    return str;
}
