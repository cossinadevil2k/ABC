var errorList = {
    204: 'Error from Server',
    901: 'Email not found',
    100: 'Missing required field',
    213: 'Login required',
    217: 'User Logged in'
};

$(document).ready(function(){

    var lgselect = $("select.selectLanguage");

    lgselect.css("background-image",'url(/images/flags/'+lgselect.val()+'.png)');

    lgselect.change(function(){
    	lgselect.css("background-image",'url(/images/flags/'+lgselect.val()+'.png)');
    });

    function setHeightPlatform(){
        var platform = $('.platform');
        platform.css('height', platform.width()/1.58 + 'px');
    }
    setHeightPlatform();

    function defaultSelectPlatform(){
        var ios = $('.ios');
        ios.find('input').addClass('justClick').attr('checked', 'checked');
        ios.find('figure').removeClass('filterGray').addClass('notFilterGray');
        ios.parent().find('span i').removeClass('notSurprise').addClass('surprise');
    }
    defaultSelectPlatform();

    //auto select vi language if url has path '/?lang=vi'
    var pathname = window.location.href;
    if (pathname.indexOf('?lang=vi') != -1) {
        $('.selectLanguage option[value="vi"]').attr("selected",true);
    }

    // Alert Error
    function alertErr(err){
        $.each(errorList, function(error, errorContent){
            if(err == error){
                $('#nameofError').text(errorContent);
            }
        })
    }

    var listSections = [];
    function setValueSection(sections, callback){
        var sectionOne = {};
        for (var i = 0; i < sections.length; i++) {
            sectionOne = {
                value: sections[i]._id,
                name: sections[i].name
            };
            listSections.push(sectionOne);
        }
    }

    function loadingFaqStatus(status){
        if (status) {
            $('.loadingFAQ').removeClass('hidden');
        } else {
            $('.loadingFAQ').addClass('hidden');
        }
    }


    //show faq follow fillter
    var limit = 999;
    // get session faq
    $.ajax({
        method: "POST",
        url: "/helpdesk/section/get",
        success: function(data){
            // console.log("section", data);
            if(data.s){
                setValueSection(data.d);
                showFAQFollowFilter(listSections);
            } else {
                alertErr(data.e);
                notice()
            }
        }
    });

    function showFAQFollowFilter(listSections){
        var language = $('.selectLanguage').val();
        // var platform = $('.selectPlatform').val();
        var platform = $("input.justClick").val();
        // console.log(language);
        loadingFaqStatus(true);
        $.each(listSections, function(i, section){
            getFaq(section.value, language, platform, limit, section.name);
        });
        loadingFaqStatus(false);
    }

    function partGetFaq() {
        $('.section').empty();
        showFAQFollowFilter(listSections);
    }

    $("select").change(function () {
        // $('.loadingFAQ').removeClass('hidden');
        partGetFaq();
    });


    // ajax get faq
    function getFaq(sid, lg, pl, limit, nameSection){
        // loadingFaqStatus(true);

        $.ajax({
            method: 'POST',
            url: '/helpdesk/faq/get',
            data: {
                sid: sid,
                lg: lg,
                pl: pl,
                limit: limit
            },
            success: function(data){
                // loadingFaqStatus(false);
                if(data.s){
                    platformFaq(data.d, sid, nameSection);

                } else {
                    alertErr(data.e);
                    notice()
                }
            }
        });
    }

    // get FAQ follow platform
    function platformFaq(data, sid, nameSection){
        console.log(data);
        $('.section').append('<div><h3><small class="nameS">'+nameSection+'</small></h3><div class="'+sid+'"></div></div>');
        if (data.length > 0) {
            var allpanel = '';
            $('.emptyfaq').addClass('hidden');
            // $('.section').append('<div><h3><small class="nameS">'+nameSection+'</small></h3><div class="'+sid+'"></div></div>');

            $.each(data, function(i, issue){
                allpanel += '<div class="faqPanel"><h4 data-toggle="collapse" data-target="#'+issue._id+'"><span class="faq-t"><i class="fa fa-angle-right"></i></span>'
                    +    issue.question
                    +   '</h4>'
                    +   '<div id="'+issue._id+'" class="collapse">'+issue.answer+'</div></div>'

            });
            $('.'+sid).html(allpanel).show('slow');
            // $('.loadingFAQ').addClass('hidden');
            autoOpenFirstFAQ();
            // if ($('.section div').length <= 0) {
            //     $('.loadingFAQ').addClass('hidden');
            //     $('.emptyfaq').removeClass('hidden');
            // }
        } else {
            $('.'+sid).html('<p style="font-weight:300; font-size: 16px;">This section has no faq.</p>')
        }
    }

    function autoOpenFirstFAQ(){
        $('.section > div:first-child .faqPanel:first-child .collapse').addClass('in');
        $('.section > div:first-child .faqPanel:first-child .faq-t').addClass('faq-o');
    }

    //event on click panel
    $('body').on('click', '.faqPanel h4', function(){
        //Only show one panel at one time
        $('.collapse').collapse('hide');

        //animated for arrow
        var self = $(this);
        var allPanel = self.parents('.section').find(".faqPanel h4");

        //var self = $(this);
        var notthis = self.parents('.section').find(".faq-o").not(self);
        var trigger = self.find(".faq-t");

        notthis.removeClass("faq-o");

        if (trigger.hasClass("faq-o")) {
            trigger.removeClass("faq-o");
        } else {
            trigger.addClass("faq-o");
        }

    });

    //show notice when ajax error
    function notice(){
        if($('.section > div').length <= 0){
            $('.notice').removeClass('hidden')
        } else {
            $('.notice').addClass('hidden')
        }
    }

    function effectPlatformClicked($box){
        var group = "input:radio[name='" + $box.attr("name") + "']";

        $(group).removeClass("justClick");

        $(group).parents('.platform').find('span i').removeClass('surprise').addClass('notSurprise');//not appear check icon

        $(group).parents('.platform').find('figure').removeClass('notFilterGray').addClass('filterGray');//add grey filter to other platform

        $box.addClass("justClick");

        $box.parents('.platform').find('span i').removeClass('notSurprise').addClass('surprise');//show check icon on platform clicked

        $box.parents('.platform').find('figure').removeClass('filterGray').addClass('notFilterGray');//add color filter to platfrom clicked
    }

    //only select one platform at one time
    $("input:radio").on('click', function() {
        // $('.loadingFAQ').removeClass('hidden');
        var $box = $(this);

        //prevent many click into 1 platform
        if ($box.is(":checked") && !$box.hasClass('justClick')) {
            effectPlatformClicked($box);
            partGetFaq();
        } else {
            //nothing to do
        }
    });
});
