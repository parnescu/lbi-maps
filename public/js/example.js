(function(){
	"use strict";
	var trace = function(h){console.log(h);}, scope, allow = true,
		hdr, desc, list,
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
			
			// return {
			// 	init: this.init,
			// 	remove: this.remove
			// }
		}

	f.prototype.clearMarkers = function(){
		trace("MAIN:: clear markers");
		scope.markers.reduce(function(p, marker){ marker.setMap(null);}, "");
		scope.markers = [];
		scope.clearBtn.style.visibility = 'hidden';
	}
	f.prototype.showMarkers = function(arr){
		f.prototype.clearMarkers();
		trace("MAIN:: build new markers");

		for (var i= 0, marker; marker = arr[i]; i++){
			marker = new google.maps.Marker({
				map: scope.map,
				title: marker.name,
				position: new google.maps.LatLng(marker.lat, marker.lng),
				_data: marker
			});
			google.maps.event.addListener(marker, 'click', function(){
				scope.currentStop = this._data;
				scope.handleMarkerDetails(this._data.id);
			});
		}
		scope.clearBtn.style.visibility = 'visible';
		i = marker = null;
	}
	f.prototype.showDetails = function(data){
		trace("MAIN:: build details view");

		trace(hdr)
		trace(desc);
		trace(list)
		
		// trace(scope.currentStop);
		// trace(data);
		scope.details.style.visibility = "visible";
	}
	f.prototype.hideDetails = function(){
		scope.details.style.visibility = "hidden";
	}
	f.prototype.handleActionClick = function(){
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
		var items = scope.search.getPlaces();
		scope.clearMarkers();

		items.reduce(function(p,marker){ trace(marker);},null);
		items = null;
	}


	// exposed methods
	f.prototype.init = function(){
		if (!this.isReady){
			throw new Error('App not initialized yet!')
		}
		trace("MAIN:: initialize");
		var layer;
		

		this.stage = document.querySelector(this.stage) || document.body;
		layer = document.createElement('section');
		layer.className = "mapHolder";
		this.stage.insertBefore(layer, document.querySelector('.busDetails'));
		

		this.map = new google.maps.Map(layer, this.mapOptions);
		this.markers = [];

		layer = new google.maps.TrafficLayer();
		layer.setMap(this.map);

		layer = document.createElement('input');
		layer.placeholder = "search near location"
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
		list = $(this.details).find('ul');

		// event listeners
		this.button.addEventListener('click', this.handleActionClick);
		this.closeBtn.addEventListener('click', this.hideDetails);
		this.clearBtn.addEventListener('click', this.clearMarkers);
		//google.maps.event.addListener(this.sBox, 'places_changed', this.handlePlacesChange);
		

		setTimeout(function(){
			scope.search.classList.add('animated')
		},300)
		layer = null;
	}
	f.prototype.remove = function(){
		// clear markers
		// destroy map
		// remove everything else
		// reset scope
		scope = null;
	}
	window.lbi = new f('#main');
})();