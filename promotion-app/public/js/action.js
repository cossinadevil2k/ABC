function setColorAndImage(){
    //set color
    $('.primaryColor-text-color').css({
        'color': style.primary_color,
        'border-color': style.primary_color,
    });
    $('.primaryColor-bg-color').css({
        'background-color': style.primary_color,
        'color': 'white',
    });

    //set header image
    if (style.header_image_post.length === 0) {
        $('.header-image-child').css({
            'background-image': 'url(/images/default-header-image-post.png)'
        });
    }
    if (style.header_image_partner.length === 0) {
        $('.header-image').css({
            'background-image': 'url(/images/default-header-image-post.png)'
        });
    }
}

$(document).ready(function(){

    // emotion rotation when click
    $('.emot-nopromot').on('click', function(){
        $(this).toggleClass('active');
    });

    // var heightFirstPost = $('.listContent > .everyP:first-child').height();
    // $('.color-pick').css('height', heightFirstPost + 44 +'px');
    // $('.listContent > .everyP:first-child').hover(function(){
    //     $(this).css('background-color', 'rgba(0,0,0,0)')
    // }, function(){
    //     $(this).css('background-color', 'rgba(0,0,0,0)')
    // });

    setColorAndImage();

});
/*_________________________________*/
