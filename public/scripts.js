$(document).ready(function() {
    update();
});
    
function update(){
    $.get("status", function(json){
        var data = JSON.parse(json), longstr = "";
        $.each(data, function(index, torrent){
            var str = '<div class="box"><span class="status activity ';
            if(torrent["traffic"]){ str += "inverse ";}
            str += torrent["status"] + '">' + torrent["status"];
            str += "</span>";
            str += "<h3>" + clearWord(torrent.name) + "</h3>";
            if(!torrent.progress){torrent.progress="100%";}
            str += '<div class="progress"><div class="progress-inner" style="width:';
            str += torrent.progress + '">' + torrent["size-downloaded"] + '</div><span>';
            str += torrent["size-total"] + '</span></div>';
            str += '<span class="status ratio';
            if(torrent.ratio <= 1){
                str += " inverse";
            }
            if(torrent.ratio == "-1.000"){
                torrent.ratio = "&nbsp;ø&nbsp;";
            } else {
                torrent.ratio = parseFloat(torrent.ratio).toFixed(2);
            }
            str += '">' + torrent.ratio + '</span>';
            if(torrent.quality){
                str += '<span class="status quality">' + torrent.quality + '</span>';
            }
            if(torrent["seeders-total"]!=undefined){
            str += '<span class="info">' + torrent["seeders-connected"] + '/';
            str += torrent["seeders-total"] + " seeders · " + torrent["peers-connected"];
            str += "/" + torrent["peers-total"] + " peers";
            str += "</span>";

            if(torrent["seeders-total"] == 0 && torrent["status"] == "downloading"){
                if(torrent["peers-total"]==1){
                    str+=' <span class="info stalled">(dead?)</span>';
                } else {
                str += ' <span class="info stalled">(stalled)</span>';
                }
            }
            }

            if(torrent["size-total"] == torrent["size-downloaded"]){
                str += '<a class="status dl" href="http://ranna.chippy.ch/' + encodeURI(torrent.name) + '">Download</a>';
            };
            
            str += "</div>";
            longstr += str;
        });
        $('#boxen').html(longstr + '<span class="reload">.</span>');
        setInterval(function(){$('.reload').hide();},1000);
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
