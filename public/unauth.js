$(document).ready(function(){
    $("#reglink").click(function(){
        $.get("auth/keygen",function(json){
            var data = JSON.parse(json);
            $("#register pre").text("/msg ranna REGISTER " + data.key);
            $("#intro").slideUp(function(){
                $("#register").fadeIn();
                authenticate(data.key);
            });
        }).error(function(){
            $("#error").slideDown();
            setTimeout(function(){
                $("#error").slideUp();
            },5000);
        });
    });
    $("#reclink").click(function(){
        $("#intro").slideUp(function(){
            $("#recover").fadeIn();
        });
    });
        
    $(".back").click(function(){
        $(".container div").hide();
        $("#intro").fadeIn();
    });
});

function authenticate(key){
    $.getJSON("auth/accepted/" + key, function(acc){
        console.log(key);
        if(acc.username){
            $(".ircauthstatus").text("Authenticated");
            $(".username").text(acc.username);
            $("input#username").val(acc.username);
            $("#regoutro").fadeIn();
            $("#regintro").slideUp();
            $("input#password").focus();
        } else {
            setTimeout(function(){
                authenticate(key)
            },1000);
        }
    }).error(function(){
        $(".ircauthstatus").addClass("error");
        $(".ircauthstatus").text("Error! :(");
    });
}
