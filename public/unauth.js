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
    $("#loglink").click(function(){
        $("#intro").slideUp();
        $("#login").fadeIn();
    });
        
    $(".back").click(function(){
        $("#login").hide();
        $("#register").hide();
        $("#intro").fadeIn();
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

                $('#regpassword').keyup(function(e){
                    if(e.keyCode == 13){
                        var len = $("#regpassword").val().length;
                        if(len > 7){
                            $("#regoutro").slideUp();
                            $("#process").fadeIn();
                            console.log($("#regusername").val());
                            $.post("auth/register", {
                                "username": $("#regusername").val(),
                                "password": $("#regpassword").val(),
                                "hash": acc.hash,
                                "slug": key
                            }).error(function(){
                                $("#error").slideDown();
                            });
                            $("#process").slideUp();
                            $("#login").fadeIn();
                        } else {
                            $("#regpassword").css("background-color","#666");
                            setTimeout(function(){
                                $("#regpassword").css("background-color","#bbb");
                            },500);
                        }
                    }
                });
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
});
