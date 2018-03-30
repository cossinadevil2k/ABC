
$(function(){

    var shrinkHeader = 105; //height of top menu + top bar

    // make top menu resize when scroll
    $(window).scroll(function() {
    var scroll = getCurrentScroll();
      if ( scroll >= shrinkHeader ) {
           $('.menu-top').addClass('shrink');
        }
        else {
            $('.menu-top').removeClass('shrink');
        }
    });
    function getCurrentScroll() {
        return window.pageYOffset || document.documentElement.scrollTop;
    }
    // ----end


    // logout action
    $('#logout').click(function(){
        var cfmLogout = confirm('Do you really want to logout?');
        if (cfmLogout) {
            sessionStorage.setItem('email', '');
            window.location = '/logout';
        }
    });

    // get year auto for copyright
    var date = new Date();
    var year = date.getFullYear();
    $('#year').text(year);

    //pass email value to all page
    var emailLogin = sessionStorage.getItem('email'); //get email logged in
    $('.emailLogin').empty().text(emailLogin);
    if(emailLogin) {
        $('.account').removeClass('hidden')
    } else {
        $('.account').addClass('hidden')
    }


    //Only show send message button on menu when scrollTop 370
    $(document).scroll(function() {
        var y = $(this).scrollTop();
        if (y > 370) {
            $('.btn-s-home').removeClass('hidden').fadeIn();
        } else {
            $('.btn-s-home').addClass('hidden').fadeOut();
        }
    });
});
