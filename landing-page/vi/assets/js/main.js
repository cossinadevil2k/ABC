jQuery(document).ready(function ($) {
  var currentItem = 1;
  $('.change-features').click(function (e) {
    e.preventDefault();
    currentItem = $(this).data('item');
    srcImg = $(this).data('image');

    $('.phone-image').fadeOut(function () {
      $('.phone-image').attr('src', srcImg);
      $('.phone-image').fadeIn();
    });
    $('.change-features').removeClass('active');
    $(this).addClass('active');
  });

  $('.change-features[data-item="1"]').click();

  setInterval(function () {
    nextItem = currentItem + 1;
    if (nextItem > 4) nextItem = 1;

    $('.change-features[data-item="'+nextItem+'"]').click();
  }, 10000);

  $('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 600);
        $('.navbar-default .navbar-left > li').removeClass('active');
        $(this).parent().addClass('active');
        return false;
      }
    }
  });
});