var errorList = {
    204: 'Wrong Password',
    901: 'Email not found',
    100: 'Please fill all required field',
    213: 'Login required',
    'UserLoggedIn': 'You are logged in'
};

$(document).keypress(function(e) {
    if(e.which == 13) {
        $('#btnLogin').click();
    }
});

function loginRequest(email, pass, callback){
    var funcSuccess = function(data){
        if (data.s) {
            callback(null, data.u);
        } else {
            callback(data.e);
        }
    };

    var data = {
        email: email,
        password: pass
    };

    $.ajax({
        method: 'POST',
        url: '/login',
        data: JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json',
        success: funcSuccess,
        error: function(){
            $('.iconLoading').addClass('hidden');
            alertErr(204);
        }
    })
}

var loginCallback = function(err, data){
    if (err) {
        $('.iconLoading').addClass('hidden');
        alertErr(err);
    } else {
        $('.iconLoading').addClass('hidden');
        sessionStorage.setItem('email', data.email);
        window.location = getCurrentUrl();
    }
};

// redirect to previous page after login
function getCurrentUrl(){
    var url = window.location.href;
    if (url.indexOf('?url=') !== -1) {
        var currentUrl = url.split('?');
        for (var i = 0; i < currentUrl.length; i++) {
            if (currentUrl[i].indexOf('url') !== -1) {
                return currentUrl[i].substring(4);
            }
        }
    } else {
        return "/"
    }
}

function alertErr(err){
    $.each(errorList, function(error, errorContent){
        if(err == error){
            alert(errorContent);
        }
    })
}
// function getInfo(){
//     var info = {};
//     info.email = $('#urEmail').val();
//     info.password = $('#urPass').val();
//     return info;
// }

var emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var validateEmail = function(email){
    return emailRegex.test(email)
};

$('#btnLogin').click(function(){
    // var userInfo = getInfo();
    // loginRequest(userInfo.email, userInfo.password, loginCallback);
    var email = $('#urEmail').val();
    var pass = $('#urPass').val();

    if (email && pass && validateEmail(email)) {
        $('.iconLoading').removeClass('hidden');
        loginRequest(email, pass, loginCallback);
    } else if(!email && pass) {
        $('#urEmail + span + .textError').removeClass('hidden');
        $('#urPass + span + .textError').addClass('hidden');
    } else if((validateEmail(email) || email) && !pass){
        $('#urEmail + span + .textError').addClass('hidden');
        $('#urPass + span + .textError').removeClass('hidden');
    } else if (!validateEmail(email) && email && pass) {
        $('#urEmail + span + .textError').removeClass('hidden');
        $('#urPass + span + .textError').addClass('hidden');
    } else {
        $('.textError').removeClass('hidden');
    }
});
// $('.btn-cancel').click(function(){
//     window.location = '/'
// });
