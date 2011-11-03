( function( $, window, undefined ) {

var gProfile = null;

function escapeEntities( str )
{
	return str.replace( /</g, "&lt;" ).replace( />/, "&gt;" ).replace( /&/, "&amp;" );
}

function createListFromArray( items, calls, arr )
{
	var ul = document.createElement( "ul" ),
		callId, call, item, li, a;

	for ( var i = 0; i < arr.length; i ++ ) {
		callId = arr[ i ];
		call = calls[ callId ];
		if ( call ) {
			item = items[ call[ 0 ] ];
			li = document.createElement( "li" );
			li.appendChild( document.createTextNode( escapeEntities( item[ 0 ] ) + " - " + call[ 3 ] ) );
			li.setAttribute( "data-id", callId );
			li.setAttribute( "id", "c-"+ callId );
			ul.appendChild( li );
		}
	}

	return ul;
}

function generateGraphs( profile )
{
	gProfile = profile;

	var ul = createListFromArray( profile.items, profile.calls, profile.graphs );
	ul.setAttribute( "id", "graphList" );

	$("#graphs").append(ul);
}

//    {
//    	version: "0.1",
//    
//    	items: {
//    		"itemId": [ label, min, max, avg, total, count ],
//    		...
//    	},
//    
//    	calls: {
//    		"callId": [ itemId, start, stop, duration, parentCallId, [ child1CallId, child2CallId, child3CallId ... ] ],
//    		...
//    	},
//    
//    	graphs: [ "callId", "callId", "callId", ... ]
//    }
//

function createChildren( $li )
{
	var callId = $li.attr( "data-id" ),
		calls = gProfile.calls,
		call = calls[ callId ],
		children = call[ 5 ];
	if ( children && children.length ) {
		$li.append( createListFromArray( gProfile.items, calls, children ) );
	}
	$li.attr( "data-loaded", "true" );
}

$(function() {
	$( "#graphs" ).bind( "click", function( e ) {
		var $li = $( e.target ).closest( "li" );
		if ( $li.length && !$li.attr( "data-loaded" ) ) {
			createChildren( $li );
		}
		$li.toggleClass( "show" );
	});
});


window.generateGraphs = generateGraphs;
window.loadProfile = function( profileId ) {
	$.getJSON( "user-profiles/"+ profileId +".json", generateGraphs );
};

})( jQuery, window );
