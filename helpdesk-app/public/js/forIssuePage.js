var errorList = {
    204: 'Error from Server',
    901: 'Email not found',
    100: 'Please fill all required field',
    213: 'Login required'
};

$(document).ready(function(){

    // make animation for input Login modal
    $('.inputLogin').on('change', function() {
        var input = $(this);
        if (input.val().length) {
          input.addClass('populated');
        } else {
          input.removeClass('populated');
        }
    });

    setTimeout(function() {
        $('#urEmail').trigger('focus');
    }, 500);
    // ----- end animated

    // count character in input
    $('#input-title, #input-description').keyup(updateCount);
    $('#input-title, #input-description').keydown(updateCount);

    function updateCount() {
        var cs = $(this).val().length;
        var charTitle = $(this).prev().find('#characters');
        var charDes = $(this).prev().find('#area-characters');
        
        charTitle.text(50 - cs);
        charDes.text(cs);

        if (cs >= 40) {
            charTitle.addClass('alertMaxChars')
        } else {
            charTitle.removeClass('alertMaxChars')
        }
    }

    // Check input valid
    var listChecking = ["#input-title", "#input-description"];
    function checkValidInput(listElements){
        $.each(listElements, function(i, element){
            $(element).keyup(function(){
                var lengthValue = $(this).val();
                if (!lengthValue) {
                    $(this).addClass('input-empty')
                } else {
                    $(this).removeClass('input-empty');
                    $('.successMessage').addClass('hidden')
                }
            });
        });
    }
    checkValidInput(listChecking);
    // ------ end check valid input

    function err_input(){
        $('.errInput').parent().removeClass('zero').addClass('hero');
        $('.errSelect').parent().addClass('zero').removeClass('hero');
        $('.successMessage').parent().addClass('zero').removeClass('hero');
    }

    // set value dropdown when select
    $('.dropdown-menu li a').click(function () {
        var selText = $(this).text();
        $(this).parents('.dropdown-pl').find('.dropdown-toggle').html('<span>' + selText +" "+ '<span class="caret"></span></span>');
    });

    // action when click Send button
    $('#sendIssue').click(function(){

        var title = $('#input-title').val();
        var des = $('#input-description').val();

        var meta = {};
        var os = $('.dropdown-pl button').text().trim();
        if (os !== 'Select Platform') {
            meta.os = os;
        }

        if (title && des && meta.os) {
            $('.errInput').parent().addClass('zero').removeClass('hero');
            $('.errSelect').parent().addClass('zero').removeClass('hero');
            $(this).addClass('is-disable');
            send(title, des, meta);
        } else if (!title && des) {
            err_input();
            $('#input-title').addClass('input-empty');
            $('#input-description').removeClass('input-empty');
        } else if (!title && !des) {
            err_input();
            $('#input-title').addClass('input-empty');
            $('#input-description').addClass('input-empty');
        } else if (title && !des) {
            err_input();
            $('#input-title').removeClass('input-empty');
            $('#input-description').addClass('input-empty');
        } else {
            $('.errInput').parent().addClass('zero').removeClass('hero');
            $('.errSelect').parent().removeClass('zero').addClass('hero');
            $('.successMessage').addClass('zero').removeClass('hero');
        }

        // var callbackSuccess = function(data){
        //     if(data.s){ // user not login
        //         openModal(title, des)
        //     } else { // user logined
        //         if (data.e === 'UserLoggedIn'){
        //             send(title, des, meta)
        //         }
        //     }
        // };
        // loginRequest('','', callbackSuccess);

    });

    function openModal(title, des){
        if (title) {
            if (des) {
                $('.requiredInput').addClass('hidden')
                $('#requireLoginModal').modal('show');
                $('.btn-gotoLogin').click(function(){
                    $('#requireLoginModal').modal('hide');
                    $('#loginModal').modal('show');
                })

            } else {
                $('#input-description + label .requiredInput').removeClass('hidden')
                $('#input-title + label .requiredInput').addClass('hidden')
            }
        } else {
            if (des) {
                $('#input-title + label .requiredInput').removeClass('hidden')
                $('#input-description + label .requiredInput').addClass('hidden')
            } else {
                $('.requiredInput').removeClass('hidden')
            }
        }
    }
    // ----- end action Send

    // reset all field
    function reset(){
        $('#input-title').val('');
        $('#input-description').val('');
        $('#ml-version').val('');
        $('#os-version').val('');
        $('#device-name').val('');
    }
    // -- end reset all field

    // Send Issue
    function send(title, description, meta){
        var successCallback = function(data){
            if (data.s) {
                $('.successMessage').removeClass('hidden');
                $('.errorMessage').addClass('hidden');
                reset();
                $('#sendIssue').removeClass('is-disable');
                window.location = '/all-issue'
            } else {
                $('.successMessage').addClass('hidden');
                $('.errorMessage').removeClass('hidden');
                $('#sendIssue').removeClass('is-disable');
            }
        };

        var data =  {
            n: title,
            c: description,
            m: meta
        };

        $.ajax({
            method: 'POST',
            url: '/helpdesk/issue/add',
            data: JSON.stringify(data),
            dataType: 'json',
            contentType: "application/json",
            success: successCallback,
            error: function(){
                $('#sendIssue').removeClass('is-disable');
                alertErr(204);
            }
        });
    }

    var emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    var validateEmail = function(email){
        return emailRegex.test(email)
    };

    // Action login

    var elements = ['#urEmail', '#urPass'];
    function keyupCheck(elements){
        $.each(elements, function(i, element){
            $(element).keyup(function(){
                var length = $(this).val();
                if (!length) {
                    $(element + ' + span + i').removeClass('hidden');
                } else {
                    $(element + ' + span + i').addClass('hidden');
                }
            })
        })
    }
    keyupCheck(elements);

    // alert Error
    function alertErr(err){
        $.each(errorList, function(error, errorContent){
            if(err == error){
                alert(errorContent);
            }
        })
    }

    // function alertError(){
    //     for (var i = 0; i < errorList.length; i++) {
    //         console.log(errorList[i]);
    //     }
    // }
    // alertError();

    function login_to_send_issue(email, pass){
        var successCallback = function(data){
            // console.log(data);
            if (data.s){
                $('#loginModal').modal('hide')
            } else {
                // alertError()
            }
        };
        loginRequest(email, pass, successCallback)
    }

    // request login
    function loginRequest(email, pass, callback){
        var funcSuccess = function(data){
            if (data.s) {
                callback(null, data.u);
            } else {
                // callback(data.e);
                alertErr(data.e)
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
                alertErr(204);
            }
        });
    }
});
