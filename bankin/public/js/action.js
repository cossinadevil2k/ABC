
$(document).ready(function(){

    //********************GLOBAL VARIABLES***********************
    var maxBank = 3;

    //********************FUNCTIONS***********************

    function countSelectBank(){
        var numberBankSelected = $('.selectedBank').length;

        if(numberBankSelected === 0){
            $('.banksSelect').html('');
            $('#assimilation i').removeClass('material-icons');
            $('#assimilation').attr('disabled', true);
            $('.formActionCompare').removeClass('formActionCompareUp');
            $('.banks').css('padding-bottom', '4%'); //return normal
        } else if (numberBankSelected < 2) {
            $('#assimilation i').removeClass('material-icons');
            $('#assimilation').attr('disabled', true);
            $('.banksSelect').html('('+numberBankSelected+'/'+maxBank+')');
            $('.formActionCompare').addClass('formActionCompareUp');
            $('.banks').css('padding-bottom', '16%'); //last bank not be overlay
        } else {
            $('#assimilation i').addClass('material-icons');
            $('#assimilation').attr('disabled', false);
            $('.banksSelect').html('('+numberBankSelected+'/'+maxBank+')');
            $('.formActionCompare').addClass('formActionCompareUp');
            $('.banks').css('padding-bottom', '16%'); //last bank not be overlay
        }
    }

    function showListBanks(){
        //change color
        $('.trapezoid').removeClass('green-trapezoid').addClass('gray-trapezoid');

        //resize list
        $('.listBanks').removeClass('hideListBanks').addClass('displayListBanks');

        //change icon
        $('.trapezoid i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }

    function closeListBanks(){
        $('.trapezoid').removeClass('gray-trapezoid').addClass('green-trapezoid');
        $('.listBanks').removeClass('displayListBanks').addClass('hideListBanks');
        $('.trapezoid i').removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }

    //allow enter key on pc and ok key in virtual keyboard mobile
    function acceptEnterKey(e, actionButton){
        var code = (e.keyCode ? e.keyCode : e.which);
        if ( (code==13)) {
            $(actionButton).click();
        }
    }


    function setMText(plan){
        var mText = $('.backFormOne');

        if (plan === 'personal'){
            mText.text('vay chi tiêu cá nhân');
        } else if (plan === 'car') {
            mText.text('mua xe');
        } else if (plan === 'house') {
            mText.text('mua nhà');
        }
    }

    //********************ACTIONS***********************
    var formInfo = 1; //detect current form in loan page

    //Finding banks after input loan amount and time
    $('#findingBanks').click(function(){
        var self = $(this);
        var money = $('#money--input').val();
        var time = $('#time--input').val();
        var plan = $("input:checkbox[name='plan']:checked").val();
        var formPlan = $('.form-select-plan');
        var formMoney = $('.form-input-money');
        var formTime = $('.form-input-time');

        if ((plan === 'personal' || plan === 'car' || plan === 'house') && formInfo === 1) {
            formInfo = 2;
            setMText(plan); // set text follow plan
            formPlan.addClass('hidden');
            formMoney.removeClass('hidden');

        } else if(money && formInfo === 2) {
            self.html("<span class='icon icon-flash'></span> Tìm ngân hàng");
            $('.form-input-time').removeClass('hidden');
            $('.userWantMoney').html(money + '₫');
            $('.form-input-money').addClass('hidden');
            $('#money--input').attr('disabled', true);
            formInfo = 3;

        } else if (time && formInfo === 3) {
            $('#time--input').attr('disabled', true);
            self.html("Tìm ngân hàng<div class='loader-bar'><div class='bar'></div></div>");
            window.location.href = 'iwant?m='+money+'&t='+time+'&p='+plan;
        }

    });

    //back to input money in loan page
    $('.userWantMoney').click(function(){
        $('.form-input-time').addClass('hidden');
        $('.form-input-money').removeClass('hidden');
        $('#money--input').attr('disabled', false);
    });

    //back to select plan in loan page
    $('.backFormOne').click(function(){
        $('.form-input-money').addClass('hidden');
        $('.form-select-plan').removeClass('hidden');
        formInfo = 1;
    });

    $('#money--input').keypress(function(e) {
        acceptEnterKey(e, '#findingBanks');
    });

    $('#time--input').keypress(function(e) {
        acceptEnterKey(e, '#findingBanks');
    });

    $('#edit-time-inputs').keypress(function(e) {
        acceptEnterKey(e, '.acceptEditLoan button');
    });

    $('#edit-money-inputs').keypress(function(e) {
        acceptEnterKey(e, '.acceptEditLoan button');
    });

    $('#money--input').autoNumeric('init');

    $('#time--input').autoNumeric('init');

    //back to loan page
    $('.back-previous-page').click(function(){
        window.history.back();
    });

    //add banks to list compare
    $('.addBankToList').click(function(){
        var self = $(this);
        if (self.hasClass('selectedBank')) {
            self.removeClass('selectedBank');
        } else {
            if ($('.selectedBank').length < maxBank) {
                self.addClass('selectedBank');
            }
        }
        countSelectBank();
    });

    //only allow select one plan in loan page
    $(".group-f input:checkbox").on('click', function() {
        var $box = $(this);
        if ($box.is(":checked")) {
            var group = "input:checkbox[name='" + $box.attr("name") + "']";
            $(group).prop("checked", false);
            $box.prop("checked", true);
        } else {
            $box.prop("checked", false);
        }
    });

    //remove bank out of list compare
    $('.moveBankOut').click(function(e){
        alert('OK');
        e.stopPropagation();
    });

    //Open detail bank modal
    $('.seeDetailBank').click(function(){
        $('.modal--detail').removeClass('animatedModal-reverse').addClass('animatedModal');
        $(this).parents('.one-bank').find('#modalBankDetail').modal();
    });

    //Close detail bank modal
    $('.closeModal').click(function(){
        var self = $(this);
        self.parent().removeClass('animatedModal').addClass('animatedModal-reverse');

        window.setTimeout(function(){
            self.parents('#modalBankDetail').modal('hide');
        }, 580); //animated keep 600ms
    });


    //Open compare bank modal
    $('#assimilation').click(function(){
        $('.modal--detail').removeClass('animatedModal-reverse').addClass('animatedModal');
        $('#modalBankCompare').modal();
    });

    //Close compare bank modal
    $('.closeModal-f').click(function(){
        var self = $(this);
        self.parent().removeClass('animatedModal').addClass('animatedModal-reverse');

        window.setTimeout(function(){
            self.parents('#modalBankCompare').modal('hide');
        }, 580); //animated keep 600ms
    });

    //********************ANIMATIONS***********************

    //expand button accept edited loan
    $('.inputEditedLoan').keyup(function(){
        $('.acceptEditLoan').addClass('acceptEditLoan-expand');
    });

    //show list banks
    $('.seeDetails').click(function(e){
        if ($('.listBanks').hasClass('hideListBanks')) { //open list banks
            showListBanks();
            e.stopPropagation(); //prevent click through button behind

        } else { //close list banks
            closeListBanks();
            e.stopPropagation(); //prevent click through button behind
        }
    });

    //close list bank if click out of button
    $('html').click(function() {
        closeListBanks();
    });

    //animated ripple click button
    $('.ripplelink').on('click', function (event) {
        event.preventDefault();

        var $div = $('<div/>'),
        btnOffset = $(this).offset(),
        xPos = event.pageX - btnOffset.left,
        yPos = event.pageY - btnOffset.top;

        $div.addClass('ripple-effect');
        var $ripple = $(".ripple-effect");

        $ripple.css("height", $(this).height());
        $ripple.css("width", $(this).height());
        $div
            .css({
                top: yPos - ($ripple.height()/2),
                left: xPos - ($ripple.width()/2),
                background: $(this).data("ripple-color")
            })
            .appendTo($(this));

        window.setTimeout(function(){
            $div.remove();
        }, 2000);
    });

});
