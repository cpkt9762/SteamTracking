"use strict";

var CWishlistController = function()
{
	this.rgElements = {};
	this.rgVisibleApps = [];
	var $elTarget = $J('#wishlist_ctn');
	this.elContainer = $elTarget;
	var _this = this;


	// Usee for the scroll handler.
	this.nHeaderOffset = $J('#wishlist_ctn').offset().top;

	this.nRowHeight = 178; // Starting value. We'll measure the first element later, when it's in the dom.

	// List of loaded elements (Used to later unload
	this.rgLoadedApps = [];

	// List of elements currently matched by a search term
	this.rgTermMatchedElements = [];

	// Current drag target
	this.elDragTarget = null;
	this.nLastPosition = -1;
	this.nDragAppId = -1;

	//this.marker = $J('<div style="position: absolute; width: 100px; height: 1px; background-color: red"></div>');
	//$J('body').append(this.marker);


	// @todo chrisk
	this.rgFilterSettings = {
		'sort': 'order',
		'last_sort': false
	};

	this.rgFilterPrefixMap = {
		'price_1' : "Price",
		'price_2' : "Price",
		'price_wallet' : "Price",
		'discount_any': "Discount",
		'discount_50': "Discount",
		'discount_75': "Discount",
		'ex_earlyaccess': "Exclude",
		'ex_prerelease': "Exclude",
		'ex_vr': "Exclude",
		'platform_windows': "Platform",
		'platform_mac': "Platform",
		'platform_linux': "Platform"
	}

	// Hook up dropdowns
	$J('#dropdown_sort .item').click(function(){
		_this.rgFilterSettings['sort'] = this.data('dropdownValue');
		_this.Update();
	});

	$J('#tab_filters').click(function(){
		$J('#tab_filters').toggleClass('hover');
		$J('#section_filters').toggleClass('hover');
	})

	$J('#wishlist_search').on('keyup', function(){
		_this.rgFilterSettings['term'] = this.value.toLowerCase();
		_this.Update();
	});

	// Add event handler to close filter section when we click outside the box
	$J('body').on('click', function(e){

		var elTarget = e.target;
		if( elTarget == $J('#tab_filters')[0] || $J('#section_filters')[0].contains( elTarget ) )
			return;


		$J('#tab_filters').removeClass('hover');
		$J('#section_filters').removeClass('hover');

	});

	window.addEventListener('scroll', this.OnScroll.bind(this));
	window.addEventListener('resize', this.OnScroll.bind(this));
	window.addEventListener('resize', this.OnResize.bind(this));
	//$elTarget.on('dragover', this.OnDragOver.bind(this));
	$J('body').on('dragover', this.OnDragOver.bind(this));
	document.body.addEventListener('drop', this.OnDrop.bind(this));

	// Add price brackets, built in JS since they vary by cc
	var $elPriceCtn = $J('#price_brackets_container');
	$elPriceCtn.append('<label><input class="filter_check" type="checkbox" name="price_1"> '+"Less than %1$s".replace(/%1\$s/g,GStoreItemData.fnFormatCurrency( g_rgPriceBrackets[0] ) )+'</label>');
	$elPriceCtn.append('<label><input class="filter_check" type="checkbox" name="price_2"> '+"Less than %1$s".replace(/%1\$s/g,GStoreItemData.fnFormatCurrency( g_rgPriceBrackets[1] ) )+'</label>');
	if( g_nWalletCents > 0 )
		$elPriceCtn.append('<label><input class="filter_check" type="checkbox" name="price_wallet"> Less than Steam Wallet balance</label>');

	// Hook up filter checkboxes
	$J('.filter_check').change(function(){
		if( this.checked )
			_this.rgFilterSettings[ this.name ] = 1;
		else
			delete _this.rgFilterSettings[ this.name ];
		_this.SaveSettings();
		_this.Update();
	});




	this.LoadAdditionalPages();


}

CWishlistController.prototype.LoadAdditionalPages = function()
{
	this.nPagesToLoad = g_nAdditionalPages;
	this.nPagesLoaded = 0;
	var _this = this;
	console.log(g_nAdditionalPages);
	for( var i=0; i < this.nPagesToLoad; i++ )
	{
		$J.ajax ( {
			type: "GET",
			url: g_strWishlistBaseURL + 'wishlistdata/',
			data: { 'p': i },
			dataType: 'json'
		}).done(function(data){
			_this.OnPageLoaded( data )
		});
	}

	if( g_nAdditionalPages == 0 )
		this.BuildElements();
}

CWishlistController.prototype.OnPageLoaded = function( data )
{
	g_rgAppInfo = Object.assign(data, g_rgAppInfo);
	this.nPagesLoaded++;
	console.log(this.nPagesLoaded);
	if( this.nPagesLoaded == this.nPagesToLoad )
		this.BuildElements();
}

CWishlistController.prototype.BuildElements = function()
{
	var _this = this;
	this.rgAllApps = Object.keys(g_rgAppInfo);

	// Callback for when a user clicks on a tag
	var fnClickTag = function()
	{
		$J('#wishlist_search').val( this.textContent );
		$J('#wishlist_search').trigger('keyup');
	}

	var fnClickTop = function()
	{

		_this.MoveToPosition( this.parentNode.parentNode.parentNode.dataset.appId, 0 );
		_this.Update( true );
		_this.OnDrop();
	}

	var fnRemoveFromWishlist = function(e)
	{

		var nAppId = this.parentNode.parentNode.parentNode.parentNode.parentNode.dataset.appId;
		var strName = g_rgAppInfo[nAppId].name

		if( !g_bCanEdit )
			return;

		ShowConfirmDialog("Remove this item from your wishlist?", "Are you sure you want to remove '%1$s' from your wishlist?<br><br>It can be re-added via the store page at any time.".replace(/%1\$s/,V_EscapeHTML(strName))).done(function(){

		$J.ajax({
			type: "POST",
			url: g_strWishlistBaseURL + 'remove/',
			data: {'appid':nAppId, sessionid: g_sessionID}
		});

		$J( '#wishlist_ctn' ).removeClass ( 'sorting' );

		delete g_rgAppInfo[ nAppId ];
		_this.rgAllApps = Object.keys(g_rgAppInfo);
		_this.Update ( true );
	});

		e.preventDefault();
		return false;
	}

	var fnDragStart = function(e)
	{
		_this.elDragTarget = this.parentNode;
		_this.elDragTarget.classList.add('dragging');

		_this.nDragAppId = this.parentNode.dataset.appId;
		if( !this.elGhostImage )
		{
			this.elGhostImage = document.createElement ( 'div' );
			this.elGhostImage.style.width = "10px";
			this.elGhostImage.style.height = "10px";
			document.body.appendChild( this.elGhostImage );
		}

		e.dataTransfer.setDragImage(this.elGhostImage,0,0);
		_this.nLastPosition = -1;
		e.dataTransfer.dropEffect = "move";

		$J( '#wishlist_ctn' ).addClass ( 'sorting' );

		//e.preventDefault();
		return false;
	}

	// Build elements

	$J.each( g_rgWishlistData, function( key, wishlist ) {
		var rgParams = {};
		var rgAppInfo = g_rgAppInfo[ wishlist.appid ]
		if( !rgAppInfo )
		{
			// @todo inject placeholder app info here so users can remove dead apps from their wishlists?
			return;
		}

		var strScreenshots = '';
		for( var i=0; i<rgAppInfo.screenshots.length; i++ )
		{
			strScreenshots += '<div style="background-image: url(' + GetScreenshotURL( wishlist.appid, rgAppInfo.screenshots[i],'.600x338' )+ ')"></div>'
		}

		var strTags = '';
		for( var i=0; i<rgAppInfo.tags.length && i<5; i++ )
		{
			strTags += '<div class="tag" data-tag-index="'+i+'">'+rgAppInfo.tags[i]+'</div>';
		}

		var strEarlyAccess = rgAppInfo.early_access ? '<span class="earlyaccess">Early Access</span>' : '';
		var strPurchaseArea = '<div class="purchase_area">' + ( rgAppInfo['subs'][0] ? rgAppInfo['subs'][0]['discount_block'] : '' );
		var strInCartLabel = ( GDynamicStore.s_rgAppsInCart[ wishlist.appid ] ) ? "In Cart" : "Add to Cart";

		if( rgAppInfo['subs'] && rgAppInfo['subs'].length == 1 && rgAppInfo['subs'][0].price > 0 )
		{
			strPurchaseArea += "<form name=\"add_to_cart_%1$s\" action=\"http:\/\/store.steampowered.com\/cart\/\" method=\"POST\">\r\n\t\t\t\t\t<input type=\"hidden\" name=\"sessionid\" value=\"%2$s\">\r\n\t\t\t\t\t<input type=\"hidden\" name=\"subid\" value=\"%1$s\">\r\n\t\t\t\t\t<input type=\"hidden\" name=\"action\" value=\"add_to_cart\">\r\n\t\t\t\t\t<input type=\"hidden\" name=\"snr\" value=\"%3$s\">\r\n\t\t\t\t\t<a class=\"btnv6_green_white_innerfade btn_medium\" href=\"javascript:addToCart(%1$s);\"><span>%4$s<\/span><\/a>\r\n\t\t\t\t<\/form><\/div>"		.replace(/%1\$s/g,rgAppInfo.subs[0].id)
			.replace(/%2\$s/g,g_sessionID)
			.replace(/%3\$s/g,GStoreItemData.rgNavParams.wishlist_cart)
			.replace(/%4\$s/g,strInCartLabel);
		}
		else if( rgAppInfo['prerelease'] )
			strPurchaseArea = '<a class="coming_soon_link" href="'+GStoreItemData.GetAppURL(  wishlist.appid , 'wishlist_details')+'"><span>Coming soon</span></a>';
		else if( rgAppInfo['free'] )
		{
			strPurchaseArea += "<a class=\"btnv6_green_white_innerfade btn_medium\" href=\"javascript:ShowGotSteamModal('steam:\/\/run\/%1$s', %2$s, &quot;Play this game now&quot; )\"><span>%3$s<\/span><\/a><\/div>"		.replace ( /%1\$s/g, wishlist.appid  )
			.replace ( /%2\$s/g, V_EscapeHTML( JSON.stringify( rgAppInfo.name ) ) )
			.replace ( /%3\$s/g, rgAppInfo['type'] == 'Game' ? "Play now" : "Watch Now" )
		}
		else
			strPurchaseArea += '<a class="btnv6_blue_blue_innerfade btn_medium" href="'+GStoreItemData.GetAppURL(  wishlist.appid , 'wishlist_details')+'"><span>View Details</span></a></div>';



		var options = {  year: 'numeric', month: 'numeric', day: 'numeric' };
		var date = new Date(rgAppInfo['added'] * 1000);
		var strAdded =  "Added on %1$s".replace(/%1\$s/, date.toLocaleDateString(options) );
		if( g_bCanEdit )
			strAdded += " ( <div %1$s>remove<\/div> )".replace(/%1\$s/, ' class="delete"' );

		var $el = $J(
			g_strRowTemplate.replace(/%1\$s/g, wishlist.appid)
				.replace(/%2\$s/g, rgAppInfo['capsule'])
				.replace(/%3\$s/g, rgAppInfo['name'] )
				.replace(/%4\$s/g, rgAppInfo['review_desc'] )
				.replace(/%5\$s/g, rgAppInfo['release_string'] )
				.replace(/%6\$s/g, strPurchaseArea )
				.replace(/%7\$s/g, rgAppInfo['platform_icons'] )
				.replace(/%8\$s/g, strTags )
				.replace(/%9\$s/g, strScreenshots )
				.replace(/%10\$s/g, rgAppInfo['review_css'] )
				.replace(/%11\$s/g, GStoreItemData.GetAppURL( wishlist.appid, 'wishlist_capsule' ) )
				.replace(/%12\$s/g, strEarlyAccess )
				.replace(/%13\$s/g, rgAppInfo['reviews_percent'] )
				.replace(/%14\$s/g, rgAppInfo['reviews_total'] )
				.replace(/%15\$s/g, strAdded )

		);

		$J('.tag',$el).click( fnClickTag );
		$J('.top',$el).click( fnClickTop );
		$J('.delete',$el).click( fnRemoveFromWishlist );
		$J('.game_review_summary',$el).v_tooltip();
		$J('.hover_handle',$el)[0].addEventListener('dragstart', fnDragStart);


		_this.rgElements[ "" + wishlist.appid ] = $el;

		// No need to attach right now, wait for update()
		//$elTarget.append($el);
	});

	this.LoadSettings();
	this.Update();
	$J('#throbber').hide();
}

CWishlistController.prototype.SetFilterString = function()
{
	var strFilterString = '';
	$J.each(this.rgFilterSettings, function(key, value) {
		if( !key || key == 'last_sort')
			return;

		if( strFilterString )
			strFilterString += '&'
		strFilterString += key + '='+value;
	});

	history.replaceState(undefined, undefined, "#" + strFilterString)
}

CWishlistController.prototype.LoadSettings = function()
{
	var lsValue = WebStorage.GetLocal('wishlistSettings');


	var rgPairs = location.hash.substring(1).split('&');
	if( rgPairs.length > 0 && rgPairs[0] )
	{
		for ( var i = 0; i < rgPairs.length; i++ )
		{
			var rgKV = rgPairs[ i ].split ( '=' );
			this.rgFilterSettings[ rgKV[ 0 ] ] = rgKV[ 1 ] ;

			$J('input[name=\''+V_EscapeHTML( rgKV[ 0 ] )+'\']').attr('checked',true);
		}
	} else if( lsValue != null )
	{
		this.rgFilterSettings = lsValue;
	}

	if( this.rgFilterSettings.sort )
		this.SetDropdownLabel('sort', this.rgFilterSettings.sort );
	if( this.rgFilterSettings.type )
		this.SetDropdownLabel('type', this.rgFilterSettings.type );
	if( this.rgFilterSettings.term )
		$J('#wishlist_search').val(this.rgFilterSettings.term);

}

CWishlistController.prototype.SaveSettings = function()
{
	var settingsCopy = Object.assign( {}, this.rgFilterSettings );

	delete settingsCopy.last_sort;
	delete settingsCopy.term;

	WebStorage.SetLocal('wishlistSettings',settingsCopy);
}


CWishlistController.prototype.SetDropdownLabel = function( strID, strValue )
{
	// Since our value mapping data is in a tooltip, we need to first create a virtual DOM from the tooltijp content.
	var $elTooltip = $J( '<div>' + $J('#dropdown_' + strID).data('tooltipContent') + '</div>' );
	// Now pop out the label
	var strLabel = $J( 'div[data-dropdown-value=\'' + V_EscapeHTML(strValue) + '\']', $elTooltip ).text();
	$J('#label_' + strID).text( strLabel );
}


CWishlistController.prototype.OnResize = function()
{
	var $el = $J('.wishlist_row');
	if( !$el )
		return;

	var nNewHeight = $el.outerHeight(true);
	if( nNewHeight > 0 && nNewHeight != this.nRowHeight )
	{
		this.nRowHeight = $el.outerHeight ( true );
		this.Update();
	}
}
CWishlistController.prototype.OnScroll = function()
{
	var nWindow = 2; // How many elements to load in advance
	var scrollTop = window.scrollY;
	var nWindowHeight = window.innerHeight;
	var nRowHeight = this.nRowHeight

	var nStart =  Math.floor( scrollTop );
	var nRows =  Math.floor( nWindowHeight / nRowHeight  );
	nStart = Math.floor( ( nStart / nRowHeight ) - ( this.nHeaderOffset / nRowHeight ) ) - nWindow;


	if( nStart < 0)
		nStart = 0;

	//this.marker.css('top',(1+nStart )* nRowHeight + this.nHeaderOffset );


	var nEnd = nStart + nRows + nWindow * 2;
	if( nEnd > this.rgVisibleApps.length )
		nEnd = this.rgVisibleApps.length;

	for( var i=nStart; i < nEnd; i++)
		this.LoadElement(i);

	for( var i=this.rgLoadedApps.length-1; i>=0; i-- )
	{
		var nIndex = this.GetPositionForAppId( this.rgLoadedApps[i] );
		if( nIndex < nStart || nIndex >= nEnd )
			this.UnloadElement(this.rgLoadedApps[i]);
	}
}

CWishlistController.prototype.GetPositionForAppId = function(appid)
{
	return this.rgVisibleApps.indexOf(appid);
}

CWishlistController.prototype.OnDragOver = function(e)
{
	if( this.nDragAppId == -1 )
		return;
	e.originalEvent.dataTransfer.dropEffect = "move";

	var nPosition = Math.floor( ( e.originalEvent.pageY / this.nRowHeight ) - ( this.nHeaderOffset / this.nRowHeight ) );
	if( nPosition < 0 )
		nPosition = 0;

	$J(this.elDragTarget).css({'top': e.originalEvent.pageY - this.nHeaderOffset - this.nRowHeight / 2});


	if( this.nLastPosition != nPosition )
	{

		this.MoveToPosition ( this.nDragAppId, nPosition );
		this.Update ( true );

	}

	this.nLastPosition = nPosition;

	return false;

}

/**
 * Assumes/requires we're in "order" sort mode
 * @param unAppId
 * @param unPosition
 * @constructor
 */
CWishlistController.prototype.MoveToPosition = function( unAppId, unPosition )
{
	var oldIdx = this.rgAllApps.indexOf(unAppId);

	this.rgAllApps.splice( oldIdx, 1 );
	this.rgAllApps.splice( unPosition, 0, unAppId );

	for( var i=0; i<this.rgAllApps.length; i++)
	{
		g_rgAppInfo[ this.rgAllApps[i] ].priority = i;
	}

}

/**
 * Called both when we drop, or manually change an index (ie when clicking "top").
 * @constructor
 */
CWishlistController.prototype.OnDrop = function(e)
{
	if( this.elDragTarget != null )
		this.elDragTarget.classList.remove('dragging');
	this.elDragTarget = null;
	this.nDragAppId = -1;
	if( !g_bCanEdit )
		return;

	$J.ajax({
		type: "POST",
		url: g_strWishlistBaseURL + 'reorder/',
		data: {'appids':this.rgAllApps, sessionid: g_sessionID}
	});

	$J( '#wishlist_ctn' ).removeClass ( 'sorting' );


	this.Update ( true );

	e.preventDefault();
}

CWishlistController.prototype.LoadElement = function( nIndex )
{

	var unAppId = this.rgVisibleApps[ nIndex ];
	var $elTarget = this.rgElements[ unAppId ];



	if ( !this.rgLoadedApps.includes ( unAppId ) )
	{
		this.rgLoadedApps.push( unAppId );
		this.elContainer.append( $elTarget );
	}

	if( !$elTarget.hasClass('dragging') )
		$elTarget.css('top', nIndex * this.nRowHeight );

}

CWishlistController.prototype.UnloadElement = function( unAppId )
{

	var $elTarget = this.rgElements[unAppId];

	// Ok this is kind of confusing verbally; we have an array of indexes, so we need the index of the index...
	var nLoadedIndex = this.rgLoadedApps.indexOf( unAppId );
	// remove it
	this.rgLoadedApps.splice(nLoadedIndex, 1);


	// Now remove the element from the dom
	 $elTarget.detach();
}

CWishlistController.prototype.SetFilterFromDropdown = function( strFilter, elSource )
{
	this.rgFilterSettings[ strFilter ] = $J(elSource).data('dropdownValue');
	$J('#label_' + strFilter).text( elSource.textContent );
	this.Update();
	this.SaveSettings();
}
CWishlistController.prototype.SetSection = function( strSection )
{
	$J('.filter_tab').removeClass('selected');
	$J('.filter_section').removeClass('selected');
	$J('#tab_'+strSection).addClass('selected');
	$J('#section_'+strSection).addClass('selected');

}

CWishlistController.prototype.Update = function( bForceSort )
{
	var $root = $J('#wishlist_ctn');


	for( var i=0; i<this.rgTermMatchedElements.length; i++)
	{
		this.rgTermMatchedElements[i].removeClass('term_matched')
	}

	var _this = this;

	if( this.rgFilterSettings.last_sort != this.rgFilterSettings.sort || bForceSort)
	{
		if( this.rgFilterSettings.sort == 'order' )
			this.rgAllApps.sort( function(a, b ) {
				return g_rgAppInfo[a].priority - g_rgAppInfo[b].priority;
			});
		else if( this.rgFilterSettings.sort == 'salesrank' )
			this.rgAllApps.sort( function(a, b ) {
				return g_rgAppInfo[a].rank - g_rgAppInfo[b].rank;
			});
		else if( this.rgFilterSettings.sort == 'reviewscore' )
			this.rgAllApps.sort( function(a, b ) {
				return g_rgAppInfo[b].review_score - g_rgAppInfo[a].review_score;
			});
		else if( this.rgFilterSettings.sort == 'releasedate' )
			this.rgAllApps.sort( function(a, b ) {
				return g_rgAppInfo[b].release_date - g_rgAppInfo[a].release_date;
			});
		else if( this.rgFilterSettings.sort == 'dateadded' )
			this.rgAllApps.sort( function(a, b ) {
				return g_rgAppInfo[b].added - g_rgAppInfo[a].added;
			});
		else if( this.rgFilterSettings.sort == 'price' )
			this.rgAllApps.sort( function(a, b ) {
				return _this.GetCheapestPrice( g_rgAppInfo[a] ) - _this.GetCheapestPrice( g_rgAppInfo[b] );
			});
		else if( this.rgFilterSettings.sort == 'name' )
			this.rgAllApps.sort( function(a, b ) {
				return g_rgAppInfo[a].name.localeCompare( g_rgAppInfo[b].name );
			});
		else
			console.log("Unknown sort order",this.rgFilterSettings.sort);

	}

	this.rgVisibleApps = [];

	// Ok, now build a list of sorted/filtered apps
	for( var i=0; i<this.rgAllApps.length; i++ )
	{
		if( !this.rgElements[ this.rgAllApps[i] ] )
		{
			continue;
		}
		if( this.BPassesFilters( this.rgAllApps[ i ], this.rgFilterSettings ) )
			this.rgVisibleApps.push( this.rgAllApps[ i ] );


	}

	if( this.rgVisibleApps.length == this.rgAllApps.length && this.rgFilterSettings.sort == "order" && g_bCanEdit )
	{

		$J( '#wishlist_ctn' ).addClass ( 'sort_order' );

		$J.each(this.rgElements, function(i, j){
			$J('.hover_handle',j).attr('draggable', true );
		});

	}
	else
	{
		$J( '#wishlist_ctn' ).removeClass ( 'sort_order' );
		$J.each(this.rgElements, function(i, j){
			$J('.hover_handle',j).attr('draggable', false );
		});
	}





	this.rgFilterSettings.last_sort = this.rgFilterSettings.sort;

	var el = this.elContainer[0].children[0];
	var nTargetRowHeight =  $J ( el ).outerHeight( true );
	if( nTargetRowHeight > 0 )
	{
		this.nRowHeight = nTargetRowHeight;
	}

	$root.css('height', ( this.nRowHeight * this.rgVisibleApps.length ) + 'px' );

	this.UpdateFilterDisplay();
	this.OnScroll();
	this.OnResize();
}

CWishlistController.prototype.UpdateFilterDisplay = function()
{
	this.rgIgnoreTagFields = ['sort', 'last_sort','show', 'type', 'term'];

	var _this = this;
	var $elContainer = $J('#filters_container');

	$elContainer.empty();
	$J.each(this.rgFilterSettings, function(key, value ) {
		if( _this.rgIgnoreTagFields.includes( key ) || !value )
			return;

		var strText = $J('input[name="'+V_EscapeHTML(key) +'"]').closest('label').text();

		var $el = $J('<div></div>').text( _this.rgFilterPrefixMap[key] + ": " + strText);
		$el.on('click', function(){
			$J('input[name='+key+']').attr('checked',false);
			delete _this.rgFilterSettings[key];
			_this.Update();
			_this.SaveSettings();
		})
		$elContainer.append($el);
	});

	if( this.rgFilterSettings.term )
	{
		var $el = $J('<div></div>').text( "Search" + ": " + this.rgFilterSettings.term);
		$el.on('click', function(){
			$J('#wishlist_search').val("");
			_this.rgFilterSettings.term = '';
			_this.Update();
		})
		$elContainer.append($el);
	}

	this.SetFilterString();
}

CWishlistController.prototype.GetCheapestPrice = function( appInfo )
{
	if( appInfo.free )
		return 0;

	var nCheapestPrice = null;

	for ( var i = 0; i < appInfo.subs.length; i++ )
	{
		if( appInfo.subs[i].price > 0 && ( nCheapestPrice == null || appInfo.subs[i].price < nCheapestPrice ) )
			nCheapestPrice = appInfo.subs[i].price;
	}


	return nCheapestPrice != null ? nCheapestPrice : Number.MAX_SAFE_INTEGER;
}


CWishlistController.prototype.BPassesFilters = function( unAppId, rgFilters ) {
	var appInfo = g_rgAppInfo[ unAppId ];
	if ( !appInfo )
		return false; // :thinking:

	var rgelMatchedElements = [];
	var elParent = this.rgElements[ unAppId ];

	if ( rgFilters.term )
	{
		var rgTerms = rgFilters.term.split(' ');

		for( var j=0; j<rgTerms.length; j++ )
		{
			var bMatchesTerm = false;
			if( rgTerms[j].length == 0 )
				continue;

			if ( appInfo.name.toLowerCase().indexOf ( rgTerms[j] ) !== -1 )
			{
				bMatchesTerm = true
				rgelMatchedElements.push( $J('.title', elParent) );
			}

			for ( var i = 0; i < appInfo.tags.length; i++ )
				if ( appInfo.tags[ i ].toLowerCase ().indexOf ( rgTerms[j] ) !== -1 )
				{
					bMatchesTerm = true;
					rgelMatchedElements.push( $J('.tag[data-tag-index=\''+i+'\']', elParent) );
				}

			if( !bMatchesTerm )
				return false;

			for( var i=0; i<rgelMatchedElements.length; i++)
			{
				rgelMatchedElements[i].addClass('term_matched');
				this.rgTermMatchedElements.push( rgelMatchedElements[i] )
			}

		}
	}

	if ( rgFilters.ex_earlyaccess && appInfo.early_access )
		return false;

	if ( rgFilters.ex_prerelease && appInfo.prerelease )
		return false;

	if ( rgFilters.ex_vr && appInfo.vr_only )
		return false;



	var bPassesPriceFilters = !rgFilters.price_1 && !rgFilters.price_2 && !rgFilters.price_wallet;

	for ( var i = 0; i < appInfo.subs.length; i++ )
	{
		if ( rgFilters.price_1 && appInfo.subs[i].price <= g_rgPriceBrackets[ 0 ] )
			bPassesPriceFilters = true;

		if ( rgFilters.price_2 && appInfo.subs[i].price <= g_rgPriceBrackets[ 1 ] )
			bPassesPriceFilters = true;

		if ( rgFilters.price_wallet && appInfo.subs[i].price <= g_nWalletCents )
			bPassesPriceFilters = true;
	}

	if( !bPassesPriceFilters )
		return false;

	var bPassesDiscountFilters = !rgFilters.discount_any && !rgFilters.discount_50 && !rgFilters.discount_75;

	for ( var i = 0; i < appInfo.subs.length; i++ )
	{

		if ( rgFilters.discount_any && appInfo.subs[i].discount_pct > 0 )
			bPassesDiscountFilters = true;

		if ( rgFilters.discount_50 && appInfo.subs[i].discount_pct >= 50 )
			bPassesDiscountFilters = true;

		if ( rgFilters.discount_75 && appInfo.subs[i].discount_pct >= 75 )
			bPassesDiscountFilters = true;
	}

	if( !bPassesDiscountFilters )
		return false;




	if( rgFilters.type && rgFilters.type != 'all')
	{
		if( rgFilters.type == 'Video' && appInfo.type != "Video" && appInfo.type != "Movie" && appInfo.type != "Series" && appInfo.type != "Episode")
			return false;
		else if ( appInfo.type != rgFilters.type )
			return false;
	}

	// Platform checks: Assume unsupported if any filters are set
	var bSupportsPlatform = !( rgFilters.platform_win || rgFilters.platform_mac || rgFilters.platform_linux );

	if( rgFilters.platform_win && appInfo.win )
		bSupportsPlatform = true;
	else if( rgFilters.platform_mac && appInfo.mac )
		bSupportsPlatform = true;
	else if( rgFilters.platform_linux && appInfo.linux )
		bSupportsPlatform = true;

	if( !bSupportsPlatform )
		return false;


	return true;
}

