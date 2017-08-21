//TODO Objectify the JS and remove PHP dependency
  
//State is the content in the url hash
//View is the current container in the viewport (scene, script, or resources). ".rsContent" picks them out
var sceneViewer = (function(){

var initial = true, oldState, newState, oldView = 0, newView, scenesData, pagesData, mainRSData, scenesRSdata, audio
  , lang = "en"
  , scenes
  , scriptText
  , scriptContainer
  , pageContainer
  , resourcesContainer
  , scriptHeader
  , pageHeader
  , resourcesHeader
  , pages 
  , resources
  , loading = false
  , loadScenes = $.getJSON("data/scenes.json")
  , loadScript = $.getJSON("data/pages.json");
	
$.when(loadScenes, loadScript).done(function(scenesRes, scriptRes){
  scenesData = scenesRes[0];
  pagesData = scriptRes[0];
});

$(window).on('textloaded', loadPageImages);
$(window).on('imagesloaded', loadResources);
$(window).on('resourcesloaded', function(e){
  loading = false;
});

$(document).ready(function(e) {

  scenes = $("#scene-container");
  scriptText = $("#script-text");
  pages = $("#pages");
  resources = $("#resources");
  scriptContainer = $("#script-container");
  pageContainer = $("#page-container");
  resourcesContainer = $("#resources-container")
  scriptHeader = scriptContainer.find('h4.row-fluid');
  pageHeader = pageContainer.children('h4').first();
  resourcesHeader = resourcesContainer.children('h4.row');

  scenesRSdata = scenes.royalSlider({
    arrowsNav: false,
    controlNavigation: 'thumbnails',
    fullscreen: {enabled: false, nativeFS: true},
    imageScaleMode: 'fit',
    autoScaleSlider: false,
    firstMargin: true,
    slidesSpacing: 20,
    imageAlignCenter: false,
    globalCaption: true,
    controlsInside: false,
    numImagesToPreload: 3,
    keyboardNavEnabled: false,
    arrowsNavAutohide: true,
    arrowsNavHideOnTouch: true,
    navigateByClick: false,
    deeplinking:{ enabled: true, change: true, prefix: "/scene/"}
  }).data("royalSlider");
  
  // Move some of the royalSlider-generated layers to other (semantic) parts of the site
  $("#nextSceneArrow").click(function(e){
     /*
      Right now this sets the default transition animation css before shifting to the 2nd scene
      so that it doesnt just jump to it. (webkit-transform is set to 0 on load, set to 600s etc. on first click).
      TODO: Disable the auto arrows and create our own. There's a slight bug because the arrow navigation remembers where the
      last position was independent of the scene scrolling. Alternatively there must be a way to update the internal memory
      of the last position: I have _thumbsPosition set, but that doens't seem to do the trick
     */
    $('.rsThumbsArrowRight').trigger('click');
    $('header .rsThumbsContainer').css('-webkit-transform', 'translate3d(-2913px, 0px, 0px)');
    scenesRSdata._thumbsPosition = -2913;
  })
  $("#prevSceneArrow").click(function(e){
    $('header .rsThumbsContainer').css('-webkit-transform', 'translate3d(0px, 0px, 0px)');
    scenesRSdata._thumbsPosition = 0;
  })

  // This block needs to happen before we init the mainRS otherwise the nav will be appended wrongly
  $("header > nav").append(scenes.find('.rsNav').addClass("hide-for-small"));
  $("#scene-caption").prepend(scenes.find(".rsGCaption"));
  //We don't want to change scene incorrectly while changing views
  scenes.find(".rsSlide").addClass("rsNoDrag");

  //I'm decoupling this with the hashchange event since the haschange event has a slight delay
  //By fading the text out first, the user will have a cue that a change is being made
  //Unbinding line-breaker so that switching doesnt change during load
  scenesRSdata.ev.on('rsBeforeMove', function(e, sceneIndex) {
    var views = scriptText.add(pages).add(resources)
      , vc = views.children()
      , vcCount = vc.length
      , vcFaded = 0
      , targetScene = ++sceneIndex;
    pages.off('scroll');
    oldState = newState;
    newState = saveState({scene: targetScene});

    $("#line-breaker").unbind('click'); // Don't want people playing with this while changing scene
    scenes.find(".rsSlide").addClass("rsNoDrag");
    audioReset();

    vc.fadeOut(600, function(){
      vcFaded++;
      if(vcFaded == vcCount){
          // Update scene id labels
    if($("#scene-caption .scene-id").length == 0)
      $("#scene-caption .rsGCaption h4").prepend("<span class='scene-id label label-inverse'></span>");
    $(".scene-id").html("Side "+ ((sceneIndex> 26) ? 2 : 1) + " Scene " + (targetScene)+" ");
    scenes.height($("#scene-by-script").height() - $("#scene-caption").height());
        views.html("");
        views.prepend('<img class="preloader" src="preloaders/preloader.gif" alt="Loading...">');
        loadPageText(targetScene);
        loadAudio(targetScene);
      }        
    });
  });
      
  mainRSData = $('#content').royalSlider({
    arrowsNav: false,
    controlNavigation: 'tabs',
    thumbs:{ arrows: false, drag:false, firstMargin: false, spacing: 0},
    fullscreen: {enabled: false},
    loop: false,
    keyboardNavEnabled: true,
    arrowsNavAutohide: true,
    arrowsNavHideOnTouch: true,
    navigateByClick: false
  }).data("royalSlider");

  $("#content .rsNav").addClass('btn-group').children().each(function(i,e){
    var child = $(e).children().first();
    $(e).attr({
      'data-placement': child.attr('data-placement'),
      'title': child.attr('title')
    }).addClass('has-tip btn btn-inverse');
  }); 
  $("#view-changer").append($("#content .rsNav"));
  $("#view-changer").tooltip({selector: '.has-tip', animation: true})
  
  mainRSData.ev.on('rsBeforeAnimStart', function(e){
    var newView = mainRSData.currSlideId
      , langHash = ((lang == "it") ? "it/" : "")
      , toPage; 
    if(newView == 0){
      location.hash = "#/scene/"+newState.scene+"/"+langHash;
      $("#script-container").animate({left: '-43%'}, mainRSData.st.transitionSpeed, mainRSData.st.easeInOut);
    }else if(newView == 1){
      toPage = scriptText.find('.pageNum').filter(function(i){return($(this).offset().top > 0)}).first().attr('data-pagenum');
      location.hash = "#/scene/"+newState.scene+"/page/"+toPage+"/"+langHash;
      $("#script-container").animate({left: '0%'}, mainRSData.st.transitionSpeed, mainRSData.st.easeInOut);
    }else{
      location.hash = "#/scene/"+newState.scene+"/resources/"+langHash;
    }
  });
  
  mainRSData.ev.on("rsAfterSlideChange", function(){
    oldView = newView;
  });


  $("#lang-chooser").on("click", "a", function(e){
    e.preventDefault()
    var li = $(this).closest("li")
      , otherLi = li.siblings()
      , hash = location.hash
      , itLoc = hash.indexOf("/it/")
    if(li.hasClass("en")){
      if (itLoc == -1){
        return
      }else{
        location.hash = hash.substring(0, itLoc) + hash.substring(itLoc+4)
        otherLi.removeClass("active")
        li.addClass("active")
      }
    }else{
      if (itLoc == -1){
        location.hash = hash+"/it/"
        otherLi.removeClass("active")
        li.addClass("active")
      }
    }
    $(window).trigger('hashchange')
  })

  $(window).resize(function(e){
    // Because a lot of the css heights for royalSlider are auto (unset) / slide dependent,
    // I'm forcing a responsive layout through resize to make sure nothing overflows
    // This is not THE MOST optimised way of doing things, but given that this resize doesn't happen very often, it should be fine.
    var viewportHeight = $(window).height()-$('#view-changer').offset().top - $('#view-changer').height();
    $("#content, #content > .rsOverflow").height(viewportHeight);
    scenes.add(scenes.children('.rsOverflow'))
      .height($("#content > .rsOverflow").height())
		  .width($('#scene-by-script').width());
    scenesRSdata.updateSliderSize(true);
    // Set height as height of container - height of heading and its margins - top and bottom paddings of the layer itself
    scriptText.height(scriptContainer.innerHeight()
      - scriptHeader.height()
      - parseInt(scriptHeader.css('margin-top'))
      - parseInt(scriptHeader.css('margin-bottom'))
      - parseInt(scriptText.css('padding-top'))
      - parseInt(scriptText.css('padding-bottom'))
    );
    pages.height(pageContainer.innerHeight()
      - pageHeader.height()
      - parseInt(pageHeader.css('margin-top'))
      - parseInt(pageHeader.css('margin-bottom'))
      - parseInt(pages.css('padding-top'))
      - parseInt(pages.css('padding-bottom'))
    );
    resources.height(resourcesContainer.innerHeight()
      - resourcesHeader.height()
      - parseInt(resourcesHeader.css('margin-top'))
      - parseInt(resourcesHeader.css('margin-bottom'))
      - parseInt(resources.css('padding-top'))
      - parseInt(resources.css('padding-bottom'))
    )
  });
  
  // this parses the hash for first load or back/forward buttons.
  $(window).hashchange(function(e){
    var scrollToPage = function(){
      var textToScrollTo = scriptText.find("a[data-pagenum='"+newState.page+"']");
      if(textToScrollTo){
        pages.scrollTo("#page-"+newState.page, 300, {easing: 'easeInOutQuad', offset: 0});
        scriptText.scrollTo(textToScrollTo, 300, {easing: 'easeInOutQuad', offset: 0});  
      }
      mainRSData.goTo(1);
      $(window).off('imagesloaded', scrollToPage)
    }
    newState = saveState();
    lang = (location.hash.indexOf("/it/") == -1) ? "en" : "it"
    if(newState.page > 0){
      if(scriptText.find("a[data-pagenum='"+newState.page+"']").length == 0)
        $(window).on('imagesloaded', scrollToPage)
      else
        scrollToPage();
    }
    scenesRSdata.goTo(newState.scene-1);
    if(location.hash.indexOf('resources') != -1)
      mainRSData.goTo(2);
    $("#resources").fadeOut(400, function(){loadResources(sceneIndex);});
    scenesRSdata.ev.trigger('rsBeforeMove', [newState.scene-1])
  });

  // Actual on docReady functions
  // Everything above are bindings and inits
  
  audioSetup();

  $(window).trigger("resize");
  $(window).trigger("hashchange");
  if(lang == "en")
    $("#lang-chooser .en a").trigger("click");
  else
    $("#lang-chooser .it a").trigger("click");
  scenesRSdata.ev.trigger('rsBeforeMove', [newState.scene-1])
});

// End onReady
    
$(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange',function(){
  var scriptContainer = $("#script-container"), sceneAndScript = $("#sceneAndscript");
  
  if(scriptContainer.css("left") != "0%"){
    scriptContainer.css("left","0%");
  }else{
    scriptContainer.animate({left: '-43%'}, mainRSData.st.transitionSpeed-200, mainRSData.st.easeInOut);
  }
  sceneAndScript.toggleClass("rsNoDrag");
  sceneAndScript.find(".rsSlide").togglesClass("rsNoDrag");
  
  $(window).trigger("resize");
});    

function audioSetup(){
	 var audioPlayerConfig = {
		audioHeight: 30,
    audioWidth: 200,
		autoPlay: false,
		alwaysShowControls: true,
		pluginPath: 'javascripts/',
		startVolume: 1,
		features: ['playpause','current', 'progress','volume'],
  };
	audio = new MediaElementPlayer(".audio", audioPlayerConfig);
}

function audioReset(){
	audio.pause();
  $(".mejs-time-loaded, .mejs-time-current").css("width","0px");
 	$(".mejs-time-handle").css("left", "0px");
  $(".mejs-currenttime").html("00:00");
}

function loadPageText(sceneIndex){
  var scriptFile = "data/script_en/script-scene-"+sceneIndex+".html";
  if(lang == "it")
    scriptFile = "data/script_it/script-scene-"+sceneIndex+".html";
  scriptText.load(scriptFile, function(resp, status, xhr){
    if(status == "error"){
      scriptText.html("Error loading manuscript.");
    }
    scriptText.find("p, h5, a").addClass("rsNoDrag");
    scriptText.find(".preloader").remove();
    scriptText.fadeIn(400, function(){scriptText.css("opacity",1);});

    if($("#line-breaker .hide").text() == "On") $("#script-text br").toggleClass("hide");
    $("#line-breaker").click(toggleLineBreaks); //  Rebinding after load to prevent switching during load.
    $(window).trigger('textloaded', [sceneIndex]);
  });
}

function loadAudio(sceneIndex){
  audio.setSrc("data/audio/"+((lang == "it") ? "i" : "")+"scene_"+sceneIndex+".mp3");
  //console.log('loading audio '+"audio/"+((lang == "it") ? "i" : "")+"scene_"+sceneIndex+".mp3")
  $(window).trigger('audioloaded'); //Or listen to actual loading.
}

function loadPageImages(e, sceneIndex){
  var pageNav = $('#page-container .nav')
    , pageNavItems = ""
    , pageImgs = ""
    , pageImages
    , totalImages
    , loadedImages = 0;
  // Load manuscript page images
  $.each(scenesData[sceneIndex].manuscript, function(i,page){
    pageNavItems += '<li data-pagenum="'+page+'"><a href="#/scene/'+newState.scene+'/page/'+page+'/">'+page+'</a></li>';
    pageImgs += '<h5 id="page-'+page+'" class="text-left" style="display: none;">Page '+page+' of 144</h5><img src="images/manuscripts/page-'+page+'.jpg" alt="Page '+page+' of 144" style="display: none;">';
  });

  pageNav.html(pageNavItems);
  pages.html(pageImgs);
  if(pageImgs == "")
    return $(window).trigger('imagesloaded', [sceneIndex]);

  pageImages = pages.children("img");
  totalImages = pageImages.length;
  pageImages.each(function(){
    $(this).on('load', function(){
      loadedImages++;
      if(loadedImages == totalImages){
        pages.children().fadeIn();
        pages.find(".preloader").remove();

        pageNav.find("a").click(function(a){
          location.hash = "#/scene/"+newState.scene+"/page/"+$(a.target).parent().attr("data-pagenum")+"/";
        });
        pages.scroll(onPageScroll);
        $(window).trigger('imagesloaded', [sceneIndex]);
      }
    });
  });
}

function onPageScroll(e){
  var pageHeaders = pages.find("h5")
    , curPg = pageHeaders.filter(function(i){return ($(this).position().top - $(this).height() - 2*$(this).css("margin-top").match(/\d*/)) <= 0}).last()
    , pageNav = $('#page-container .nav');
  if (curPg.length == 0){  return; }
  curPg = curPg.attr("id").substr(5);
  
  if (pageNav.find("li.active").attr("data-pagenum") != curPg){
    pageNav.find("li.active").removeClass("active");
    pageNav.find("li[data-pagenum='"+curPg+"']").addClass("active");
    scriptText.stop();
    scriptText.scrollTo(scriptText.find("a[data-pagenum='"+curPg+"']"), 200, {easing: 'linear', offset: 0});  
    /*
    The reason why we don't ust change the hash is because hashchange automatically scrolls to the header
    Upon a change in page number in the hash. If we change the hash here, the moment we scroll upwards to 
    a previous page, the hashchange event will scroll us to the top of that page. If you don't understand
    uncomment to see for yourself. Note that you'll have to change the scrollTo function at the bottom of
    the haschange function to have an offset of 0 (negative offset will make things bounce)
    */
    //location.hash = "#/scene/"+newState.scene+"/page/"+curPg+"/";
  }

}

function sanitize(str){
  if(str == undefined)
    return ""
  return unescape(String(str).replace(/%22/gi,"'"));
}
    


function loadResources(e, sceneIndex){
    // unclick all the buttons and click the one corresponding to selected scene
    $('meta[name=scene]').attr('content', sceneIndex);
    $("#clear-filters-button").trigger("click");
    

}

function saveState(specificState){
  var state = {
    scene: location.hash.match(/scene\/(\d)+/gi),
    page: location.hash.match(/page\/(\d)+/gi),
    side: 1,
  };
  state.scene = (state.scene ? parseInt(state.scene[0].substr(6)) : 1);
  state.page = (state.page ? parseInt(state.page[0].substr(5)) : 0);
  state = $.extend(state, specificState);
  if(state.scene > 27) state.side = 2;
    return state;
}

function toggleLineBreaks(){
  $("#script-text br").toggleClass("hide");
  $("#line-breaker").toggleClass("btn-success");
  $("#line-breaker").children("span").toggleClass("hide");
}

})();
