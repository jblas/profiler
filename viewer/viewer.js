( function( $, window, undefined ) {

//    {
//    	version: "0.1",
//    
//    	useragent: "...",
//    
//    	date: 0,
//    
//    	items: {
//    		"itemId": [ label, min, max, avg, total, count ],
//    		...
//    	},
//    
//    	calls: {
//    		"callId": [ itemId, duration, parentCallId, [ child1CallId, child2CallId, child3CallId ... ] ],
//    		...
//    	},
//    
//    	graphs: [ "callId", "callId", "callId", ... ]
//    }
//

var gProfile = null,
	gGraphMinDuration = 1;

function escapeEntities( str )
{
	return str.replace( /</g, "&lt;" ).replace( />/, "&gt;" ).replace( /&/, "&amp;" );
}

function generateCallTable( profile )
{
	var items = profile.items,
		filtered = [],
		output = [ '<table id="item-table" border="1" cellspacing="0" cellpadding="4"><tr><th>Count</th><th>Min</th><th>Max</th><th>Avg</th><th>Total</th><th>Label</th></tr>' ],
		item, i, k;

	for ( k in items ) {
		item = items[ k ];
		item.id = k;
		if ( item[ 5 ] != 0 ) {
			filtered.push( item );
		}
	}

	filtered = filtered.sort( function( a, b ) {
		a = a[ 2 ];
		b = b[ 2 ];
		return ( a > b ) ? -1 : ( ( a < b ) ? 1 : 0);
	});

	for ( i = 0; i < filtered.length; i++ ) {
		item = filtered[ i ];
		output.push('<tr id="i-' + item.id + '" data-id="' + item.id + '">'
			+ '<td>' + item[ 5 ] + '</td>'
			+ '<td>' + item[ 1 ] + '</td>'
			+ '<td>' + item[ 2 ] + '</td>'
			+ '<td>' + item[ 3 ] + '</td>'
			+ '<td>' + item[ 4 ] + '</td>'
			+ '<td>' + item[ 0 ] + '</td>'
			+ '</tr>');
	}

	output.push( '</table>' );
	$( "#items" ).html( output.join( "") );
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
			li.appendChild( document.createTextNode( escapeEntities( item[ 0 ] ) + " - " + call[ 1 ] ) );
			li.setAttribute( "data-id", callId );
			li.setAttribute( "id", "c-"+ callId );
			ul.appendChild( li );
		}
	}

	return ul;
}

function generateGraphs( profile )
{
	var filtered = [],
		graphs = profile.graphs,
		calls = profile.calls,
		i, c, g;
	
	for ( i = 0; i < graphs.length; i++ ) {
		g = graphs[ i ];
		c = calls[ g ];
		if ( c && c[ 1 ] >= gGraphMinDuration ) {
			filtered.push( g );
		}
	}

	var ul = createListFromArray( profile.items, calls, filtered );
	ul.setAttribute( "id", "graph-list" );

	$("#graphs").append(ul);
}

function createChildren( $li )
{
	var callId = $li.attr( "data-id" ),
		calls = gProfile.calls,
		call = calls[ callId ],
		children = call[ 3 ];
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
	$( "#call-stats-hdr" ).bind( "click", function() {
		$( "#item-table" ).toggleClass( "hide" );
	});
	$( "#call-graphs-hdr" ).bind( "click", function() {
		$( "#graph-list" ).toggleClass( "hide" );
	});
});

function setUpPage( profile )
{
	gProfile = profile;
	$( "#useragent span" ).text( escapeEntities( profile.useragent || "Not Specified" ) );
	$( "#date span" ).text( profile.date ? escapeEntities( ( new Date( profile.date ) ).toLocaleString() ) : "Not Specified" );
	generateCallTable( profile );
	generateGraphs( profile );
}

window.setUpPage = setUpPage;
window.generateGraphs = generateGraphs;
window.loadProfile = function( profileId ) {
	$.getJSON( "user-profiles/"+ profileId +".json", setUpPage );
};

})( jQuery, window );
