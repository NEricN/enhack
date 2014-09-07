////////////////// Customization //////////////////

// Google-Maps

gm_address = "St Elisabeth Street, Melbourne, Australia";


////////////////// Customization End //////////////////

$(document).ready(function() {

	// The navigation menu

	// filter isotope

	$(".isotope-filter a").click(function() {
		var selector = $(this).attr("data-filter");
		$(".isotope-portfolio").isotope({
			filter: selector
		});
		return false;
	});

	// isotope portfolio

	$(".item").hover(
		function() {
			var currentItem = $(this);
			currentItem.find("div.item-slider").animate({top:"0px"},300);
			setTimeout(function() {
				currentItem.find("div.item-name").animate({bottom:"0px"},150);
			},325);
		},
		function() {
			var currentItem = $(this);
			currentItem.find("div.item-name").animate({bottom:"-30px"},150);
			setTimeout(function() {
				currentItem.find("div.item-slider").animate({top:"-100px"},200);
			},175);
		}
	);

	// onload animation

	setTimeout(function() {
		// get elements
		innerBar = $(".inner-bar");

		if($.browser.msie) {
			// do nothing
		} 
		else {
			// get length of innerbar
			for (i=0; i <= innerBar.length-1; i++) {
				innerBarStyle = innerBar.eq(i).attr("style");
				splitString = innerBarStyle.split(" ");
					// check if skill percentage has 2 or 3 characters
					if (splitString[1].length == 3) {
						innerBarWidth = splitString[1].substring(0,2);
					}	
					else {
						innerBarWidth = splitString[1].substring(0,3);
					}
				innerBar.eq(i).show().css({width:"1%"}).animate({"width":innerBarWidth+"%"},1000);
			}
		}
	},750);

	// fancybox for img

	$(".fancybox.img").fancybox();

	// validation

	$("#contact").validate({
		submitHandler: function(form) {
			$(form).ajaxSubmit({
				url: 'submit.php',
				success: function() {
					$(".icon-wrapper").show();
					$("#contact").css({opacity:"1"});				
					setTimeout(function() {
						$(".icon-wrapper").hide();
						$(".c_name, .c_email, .c_message").val("");
						$("#contact").css({opacity:"1"});
					}, 3500);						
				}
			});
		}
	});

});
