/* 
	loading the bus stops was done manually at first by pressing a button,
	now it's handled automatically by map-drag events and delays have been added to prevent 
	flood-calls to the server.

	the test took more than 4hrs because I had to do research on the google maps API and 
	I also took my time testing the look & feel of the app.
	when no time restrictions are "forced", I like to work out the kinks as thoroughly as I can.
	the "design" of the app won't win a webby award soon but the UX is simple and to the point &
	of course there's plenty of room for improvements and optimisations. 

	hope you enjoy what I did here as much as I enjoyed making it :)
*/

(function(){
	"use strict";
	var trace = function(h){console.log(h);}, scope, allow = true,
		hdr, desc, list, routz, indice, dragDelayer,

		// loader "class", uses jquery & "promises" for clean async loading
		ldr = function(){
	 		var stopById = 'http://digitaslbi-id-test.herokuapp.com/bus-stops/%id%',
	 			stops = "http://digitaslbi-id-test.herokuapp.com/bus-stops?northEast=%ne%&southWest=%sw%",
	 		
	 		_getFromApi = function(id, coords){
	 			var link = id ? stopById : stops, def = jQuery.Deferred();
	 			id = id || "";
	 			coords = coords || { ne: "", sw: ""};
	 			link = link.replace("%id%", id).replace("%ne%", coords.ne).replace("%sw%", coords.sw);

	 			scope.preloader.style.visibility = 'visible';
	 			scope.search.classList.remove('loaded');

	 			trace("LOADER:: fetching: "+link);
	 			$.ajax({
	 				url: link,
	 				method: "GET",
	 				dataType: "jsonp",
	 				data: "{callback:foo}",
	 				error: function(e){ def.reject(e)},
	 				success: function(data){ def.resolve(data);}
	 			}).always(function(){ 
	 				scope.preloader.style.visibility = 'hidden';
	 				scope.search.classList.add('loaded')
	 			});
	 			return def.promise();
	 		}
	 		return {
	 			get: _getFromApi
	 			,LINK_BUS_STOP: stopById
	 			,LINK_ALL_STOPS: stops
	 		}
	 	},

	 	// main application "class"
		f = function(stage, lat, lng, zoomLevel){ 
			trace("MAIN:: constructor");
			scope = this;
			lat = lat || 51.52175696963006;
			lng = lng || -0.07973971337754483;
			zoomLevel = zoomLevel || 18;
			
			this.isReady = false;
			this.stage = stage;
			this.loader = new ldr();

			this.map = null;
			this.markers = [];
			this.search = null;
			this.button = null;

			this.events = {
				APP_INIT: "doneLoadingApp"
				,API_LOAD_SUCCESS: "doneLoadingFromApi"
				,API_LOAD_FAIL: "failToLoadFromApi"
			}
			this.mapOptions = { 
				center: new google.maps.LatLng(lat, lng)
				,zoom: zoomLevel
			}

			var _flag = function(e){ 
				trace("MAIN:: ...maps ready");
				scope.isReady = true;
				scope.init();
			}
			google.maps.event.addDomListener(window, 'load', _flag);
			
			return {
				remove: this.remove
			}
		}

	f.prototype.clearMarkers = function(e){
		if (e && e.target){ 
			e.preventDefault();
			scope.search.value = "";
			scope.closeBtn.click();
		}

		trace("MAIN:: clear markers");
		scope.markers.reduce(function(p, marker){ marker.setMap(null);}, "");
		scope.markers = [];
		scope.clearBtn.style.visibility = 'hidden';

	}
	f.prototype.showMarkers = function(arr){
		// parse marker data from the API or from google search results
		f.prototype.clearMarkers();
		trace("MAIN:: build new markers");

		for (var i= 0, marker; marker = arr[i]; i++){
			marker = new google.maps.Marker({
				map: scope.map,
				title: marker.name,
				position: marker.geometry ? marker.geometry.location : new google.maps.LatLng(marker.lat, marker.lng),
				_data: marker
			});
			google.maps.event.addListener(marker, 'click', function(){
				scope.currentStop = this._data;
				scope.handleMarkerDetails(this._data.id);
			});
			scope.markers.push(marker);
		}
		scope.clearBtn.style.visibility = 'visible';
		i = marker = null;
	}
	f.prototype.showDetails = function(data){
		// populate details screen based on loaded data from the API
		trace("MAIN:: build details view");
		var el, txt;

		hdr.text(scope.currentStop.name);
		desc.text("last updated: "+data.lastUpdated);
		indice.text(scope.currentStop.stopIndicator);
		routz.html(scope.currentStop.routes.reduce(function(txt,route){
			txt += "<span data-id='"+route.id+"'>"+route.name+"</span>"
			return txt;
		},"available routes: "));
		
		list.innerHTML = "";
		trace(scope.currentStop)
		data.arrivals
			.sort(function(a,b){ return a.routeName <= b.routeName})
			.forEach(function(item){
				txt = "<a href='#noAction' title='towards "+item.destination+"''><span class='time'>"+item.scheduledTime+"</span>";
				txt += "<span class='route'>"+item.routeName+"</span>";
				txt += "<span class='wait'>ETA: "+item.estimatedWait+"</span>";
				txt += "</a>";

				el = document.createElement('li');
				el.innerHTML = txt;
				list.appendChild(el);
			});
		scope.details.style.visibility = "visible";
	}
	f.prototype.hideDetails = function(){
		scope.details.style.visibility = "hidden";
	}
	f.prototype.handleActionClick = function(){
		// the "action" button was put in place to manually load bus-stops
		// later it has been hidden and drag-events trigger this
		// -> get the displayed map bounds, parse values and load from API 
		if (allow){
			allow = false;
			var bounds = scope.map.getBounds().toUrlValue().split(","), fn
			trace("MAIN:: get markers for "+bounds);
			
			scope.loader.get( null,{ 
				ne: bounds.splice(0,2).join(",")
				,sw: bounds.join(",")
			}).then(function(data){
				trace("MAIN:: loaded "+data.markers.length+" markers");
				fn = (data.markers.length > 0) ? scope.showMarkers : scope.clearMarkers;
				fn(data.markers);
				allow = true;
			});
		}
	}
	f.prototype.handleMarkerDetails = function(id){
		// clicking on a marker calls the API with it's id
		trace('MAIN:: load details for marker: '+id)
		if (allow){
			allow = false;
			scope.loader.get(id).then(function(data){
				trace("MAIN:: details loaded");
				scope.showDetails(data);
				allow = true;
			});	
		}
	}
	f.prototype.handleSeachBox = function(){
		// when searching for something ... get the first result
		// move map to that location and load items 
		trace('MAIN:: searched for something... repopulate');
		var firstMarker = scope.sBox.getPlaces()[0];
		if (firstMarker){
			scope.showMarkers([firstMarker]);
			scope.map.panTo(firstMarker.geometry.location);
			scope.button.click()	
		}
	}


	// exposed methods
	f.prototype.init = function(){
		if (!this.isReady){
			throw new Error('App not initialized yet!')
		}
		trace("MAIN:: initialize");
		var layer;
		
		// determine where everything fits together
		this.stage = document.querySelector(this.stage) || document.body;
		layer = document.createElement('section');
		layer.className = "mapHolder";
		this.stage.insertBefore(layer, document.querySelector('.busDetails'));
		

		// initialize map and setup inputs
		this.map = new google.maps.Map(layer, this.mapOptions);
		this.markers = [];

		layer = new google.maps.TrafficLayer();
		layer.setMap(this.map);

		layer = document.createElement('input');
		layer.placeholder = "search for the nearest bus stop"
		layer.type = "search";
		layer.className = "loaded";
		this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(layer);	
		
		this.sBox = new google.maps.places.SearchBox(layer);
		this.search = layer;
		this.button = document.querySelector('button.action');
		this.details = document.querySelector('.busDetails');
		this.closeBtn = document.querySelector('.close');
		this.clearBtn = document.querySelector('.clear');
		this.preloader = document.querySelector('.preloader');


		// cache detail screen items
		hdr = $(this.details).find('h2');
		desc = $(this.details).find('p.lastUpdated');
		indice = $(this.details).find('p.indicator');
		routz = $(this.details).find('p.routes');
		list = $(this.details).find('ul')[0];

		$('.busDetails .arrivals a').on("click", function(e){ e.preventDefault();});

		// add event listeners
		this.button.addEventListener('click', this.handleActionClick);
		this.closeBtn.addEventListener('click', this.hideDetails);
		this.clearBtn.addEventListener('click', this.clearMarkers);
		google.maps.event.addListener(this.sBox, 'places_changed', scope.handleSeachBox);
		google.maps.event.addListener(this.map, "dragstart", function(){ clearTimeout(dragDelayer);});
		google.maps.event.addListener(this.map, "dragend", function(){ dragDelayer = setTimeout(function(){ scope.button.click();}, 500)});

		// load stops for default location		
		this.search.classList.add('animated');
		setTimeout(function(){ scope.button.click(); }, 500);

		layer = null;
	}
	f.prototype.remove = function(){
		// clear markers & listeners
		// destroy dom elements,
		// garbage collect everything else

		scope.clearMarkers();
		scope.button.removeEventListener('click', scope.handleActionClick);
		scope.closeBtn.removeEventListener('click', scope.hideDetails);
		scope.clearBtn.removeEventListener('click', scope.clearMarkers);
		
		google.maps.event.clearListeners(scope.sBox, 'places_changed');
		google.maps.event.clearListeners(scope.map, "dragstart");
		google.maps.event.clearListeners(scope.map, "dragend")

		scope.stage.parentNode.removeChild(scope.stage);

		scope.sBox = scope.map = scope.button = scope.closeBtn = scope.clearBtn = null;
		hdr = desc = list = routz = indice = dragDelayer = null;
		scope = null;
	}

	// expose plugin to global scope
	window.lbi = new f('#main');
})();