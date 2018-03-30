$(document).ready(function () {
    //********************GLOBAL VARIABLES***********************
    var startPromotion = 1; //it means loading from the first promotion in data
    var listData;
    var dataStoraged = localStorage.getItem('dataStorage');
    var dateStoraged = Number(localStorage.getItem('dateStorage'));
    var expiredDataStorage = 10800; //auto remove dataStoraged after 10800s (3h)

    //********************FUNCTIONS***********************

    function autoRemoveDataStorage(){
        var currentTime = new Date()/1000;
        var eDate = dateStoraged + expiredDataStorage;

        if (eDate <= currentTime) {
            localStorage.removeItem("dataStorage");
            localStorage.removeItem("dateStorage");
        }
    }

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    function formatDate(d) {
        var date = new Date(d);
        var dd = date.getDate();
        var mm = date.getMonth()+1;
        var yyyy = date.getFullYear();
        if(dd<10){dd='0'+dd}
        if(mm<10){mm='0'+mm};
        if (yyyy < 2016) {
            return d = ""
        } else {
            return d = "<small>ngày hết hạn: </small>" + dd +'/'+mm+'/'+yyyy
        }

    }

    function formatCoupon(c){
        if (c) {
            return c = '<small>coupon: </small><span class="coupon">'+ c +'</span>'
        } else {listData.total
            return c = ""
        }
    }

    function errorGetListPromotions(){
        $('.listPromotions').empty();
        $('.error').removeClass('hidden');
    }

    function emptyPromotion(){
        $('.listPromotions').empty();
        $('.emptyList').removeClass('hidden');
    }



    function loadSequence(data, page){
        var max;
        if (page*18 > data.total) {
            max = data.total;
        } else {
            max = page*18;
        }

        for (var i = ((page*18) - 18); i < max; i++) {
            $('.listPromotions').append('<div class="col-xs-12 col-sm-6 col-md-4 col-lg-4 promotion animated fadeInUp">'
            +   '<a href="/detail?p='+i+'" style="text-decoration:none">'
            +   '<div class="banner">'
            +       '<img src="'+ data.promotions[i].thumbnail +'" alt="banner" />'
            +   '</div>'
            +   '<div>'
            +       '<div class="title">'+ data.promotions[i].title +'</div>'
            +       '<div class="offer">'
            +           '<small>Offer: </small>'
            +           '<span class="offerId">'+ data.promotions[i].offer_id +'</span>'
            +       '</div>'
            +       '<div class="expiredDate">'
            +           formatCoupon(data.promotions[i].coupon_code)
            +           formatDate(data.promotions[i].expired_date_format) +'</div>'
            +   '</div></a></div>')
        }
    }

    function showPromotion(data){
        $('.listPromotions').empty();
        listData = data;
        console.log(data);
        localStorage.setItem('dataStorage', JSON.stringify(data));
        loadSequence(listData, startPromotion); // load sequence
        setDetail(data); //set detail promotion in detail page
    }

    //set detail one promotion for promotion page
    function setDetail(data){
        var id = getParameterByName('p');

        if (id) {
            $('.title-detail').text(data.promotions[id].title);
            $('.offer-detail').text(data.promotions[id].offer_id);
            $('.category-detail').html(formatCategoryDetail(data.promotions[id].category_name));
            $('.coupon-detail').html(formatCoupon(data.promotions[id].coupon_code));
            $('.expired-date-detail').html(formatDate(data.promotions[id].expired_date_format));
            $('.condition-detail').html(formatCondition(data.promotions[id].condition));
            $('.content-detail').html(data.promotions[id].content);
            $('.buy a').attr('href', getLinkMl(data.promotions[id].aff_url));

            setLinkImage(getLinkMl(data.promotions[id].aff_url));//click image redirect to offer link
        }
    }

    function getLinkMl(linkBookmark) {
        return linkBookmark = linkBookmark.replace('{publisher_id}', 'bookmark');
    }

    function setLinkImage(link){
        $('.content-detail img').click(function(){
            window.location.href = link;
        });
    }

    function formatCategoryDetail(category){
        if(category){
            return category = "<small>Thể loại: </small>" + category;
        } else {
            return category = "";
        }
    }

    function formatCondition(condition){
        if(condition){
            return condition = "<small>Điều Kiện: </small>" + condition;
        } else {
            return condition = "";
        }
    }

    // $('html, body').animate({
    //     scrollTop: 300;
    // }, 800);


    //********************ACTIONS***********************

    //request get list promotions
    if (dataStoraged) {
        var data = JSON.parse(dataStoraged);
        showPromotion(data);
    } else {
        $.ajax({
            method: 'GET',
            url: 'http://api.masoffer.com/promotions?type=jsonp',
            crossDomain: true,
            dataType: "jsonp",
            jsonpCallback: "mo_callback",
            success: function(data) {
                if (data.status === 1) {
                    showPromotion(data.data);
                    localStorage.setItem('dateStorage', new Date()/1000);
                } else {
                    emptyPromotion();
                }
            },
            error: function(){
                errorGetListPromotions();
            }
        });
    }
    autoRemoveDataStorage();

    //scroll to bottom auto load and append 18 promotion to list
    $.fn.visible = function(partial) {
        var $t            = $(this),
        	$w            = $(window),
        	viewTop       = $w.scrollTop(),
        	viewBottom    = viewTop + $w.height(),
        	_top          = $t.offset().top,
        	_bottom       = _top + $t.height(),
        	compareTop    = partial === true ? _bottom : _top,
        	compareBottom = partial === true ? _top : _bottom;

        return ((compareBottom <= viewBottom) && (compareTop >= viewTop));
    };

    $(window).scroll(function(event) {
        $(".loadSequence").each(function(i, el) {
            var el = $(el);
            if (el.visible(true)) {
                $('.loadSequence i').removeClass("loadSequence");
                startPromotion += 1;
                // cannot load if end of promotions
                if (startPromotion*18 <= (listData.total+18)) {

                    loadSequence(listData, startPromotion);
                } else {
                    $('.loadSequence').html('<i class="fa fa-tasks" aria-hidden="true"></i> Hết.')
                }
            }
        });
    });

    //********************ANIMATIONS***********************

});
