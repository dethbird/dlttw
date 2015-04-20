/** Sitewide functions */


var amznProducts = [
	"B00QKVYKZ4",
	"1623260353",
	"1118269748",
	"0199970785",
	"1118215524",
	"0300199007",
	"1250002958",
	"007182393X",
	"0071836322",
	"1118951352",
	"1449314201",
	"B00FQVNYR4",
	"B005X1Y7I2",
	"B005OW4BFE",
	"1482014092",
	"1118954831",
	"0071841156",
	"1591848075"
];

$(window).ready(function(){

    var user = JSON.parse($("#twitter-user").html());

	$('.swap').each( function(i,object){
		var object = $(object);
		var objectSwap = $('#' + object.attr('id') + '-swap');

    	object.data('src-swap', objectSwap.attr('src'));
    	object.data('src', object.attr('src'));

    	object.mouseover(function(){
        	object.attr('src', object.data('src-swap'));
    	});

	    object.mouseout(function(){
	        object.attr('src', object.data('src'));
	    });
	});


	$('.alert-dismissable').each( function(i,object){
		var object = $(object);
		setTimeout(function(){
			object.fadeOut(1200);
		},
		1500);

	});

    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");
        var span = $(this).find('span');
        if ($("#wrapper").hasClass('toggled')) {
            $(span).removeClass('glyphicon-chevrnon-left');
            $(span).addClass('glyphicon-menu-hamburger');
        } else {
            $(span).addClass('glyphicon-chevron-left');
            $(span).removeClass('glyphicon-menu-hamburger');
        }
        // $.each($('#menu-toggle span'), function (i,e){
        //     e = $(e);
        //     if(e.hasClass(.glyphicon-));
        // });
    });

    if(!_.isNull(user)) {
        var SidebarAdsView = Backbone.View.extend({
            amznProducts: [],
            initialize: function(containerId, amznProducts) {
                this.el = $(containerId);
                this.amznProducts = amznProducts;
                this.showNext();
            },
            showNext: function() {
                var that = this;
                var index = Math.floor(Math.random() * (amznProducts.length));
                var template = _.template( $("#amzn-product-template").html());
                this.el.html(template({id: amznProducts[index]}));

                setTimeout(function(){
                    that.showNext();
                }, 10000);
            }
        });
        if ($('#nav_ad').length) {
            var sbAdView = new SidebarAdsView('#nav_ad', amznProducts);
            $('#nav_ad iframe').on('mouseover', function(){
                ga('send', 'event', "app", "nav-ad", "mouseover");
            });
        }

        ga('create', 'UA-61919997-1', {userId: user.screen_name});
        ga('set', 'dimension1', user.screen_name);
    } else {
        ga('create', 'UA-61919997-1', 'auto');
    }
    ga('send', 'pageview');

});