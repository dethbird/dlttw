/** Sitewide functions */

$(document).ready(function(){


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

    
});