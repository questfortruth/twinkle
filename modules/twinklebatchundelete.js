//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklebatchundelete.js: Batch undelete module
 ****************************************
 * Mode of invocation:     Tab ("Und-batch")
 * Active on:              Existing user pages
 * Config directives in:   TwinkleConfig
 */


Twinkle.batchundelete = function twinklebatchundelete() {
	if( mw.config.get("wgNamespaceNumber") !== mw.config.get("wgNamespaceIds").user || 
		!mw.config.get("wgArticleId") ) {
		return;
	}
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		Twinkle.addPortletLink( Twinkle.batchundelete.callback, "批復", "tw-batch-undel", "反刪除頁面" );
	}
};

Twinkle.batchundelete.callback = function twinklebatchundeleteCallback() {
	var Window = new Morebits.simpleWindow( 800, 400 );
	Window.setScriptName("Twinkle");
	Window.setTitle("批量反刪除");
	var form = new Morebits.quickForm( Twinkle.batchundelete.callback.evaluate );
	form.append( {
			type: 'textarea',
			name: 'reason',
			label: '理由：'
		} );

	var query = {
		'action': 'query',
		'generator': 'links',
		'titles': mw.config.get("wgPageName"),
		'gpllimit' : Twinkle.getPref('batchMax') // the max for sysops
	};
	var wikipedia_api = new Morebits.wiki.api( '抓取頁面', query, function( self ) {
			var xmlDoc = self.responseXML;
			var snapshot = xmlDoc.evaluate('//page[@missing]', xmlDoc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );
			var list = [];
			for ( var i = 0; i < snapshot.snapshotLength; ++i ) {
				var object = snapshot.snapshotItem(i);
				var page = xmlDoc.evaluate( '@title', object, null, XPathResult.STRING_TYPE, null ).stringValue;
				list.push( {label:page, value:page, checked: true });
			}
			self.params.form.append( {
					type: 'checkbox',
					name: 'pages',
					list: list
				}
			);
			self.params.form.append( { type:'submit' } );

			var result = self.params.form.render();
			self.params.Window.setContent( result );


		}  );
	wikipedia_api.params = { form:form, Window:Window };
	wikipedia_api.post();
	var root = document.createElement( 'div' );
	Morebits.status.init( root );
	Window.setContent( root );
	Window.display();
};
Twinkle.batchundelete.currentUndeleteCounter = 0;
Twinkle.batchundelete.currentundeletor = 0;
Twinkle.batchundelete.callback.evaluate = function( event ) {
	Morebits.wiki.actionCompleted.notice = '狀態';
	Morebits.wiki.actionCompleted.postfix = '反刪除已完成';

	var pages = event.target.getChecked( 'pages' );
	var reason = event.target.reason.value;
	if( ! reason ) {
		alert("您需要指定理由。");
		return;
	}
	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init( event.target );

	if( !pages ) {
		Morebits.status.error( '錯誤', '沒什麼要反刪除的，取消操作' );
		return;
	}

	var work = Morebits.array.chunk( pages, Twinkle.getPref('batchUndeleteChunks') );
	Morebits.wiki.addCheckpoint();
	Twinkle.batchundelete.currentundeletor = window.setInterval( Twinkle.batchundelete.callbacks.main, 1000, work, reason );
};

Twinkle.batchundelete.callbacks = {
	main: function( work, reason ) {
		if( work.length === 0 && Twinkle.batchundelete.currentUndeleteCounter <= 0 ) {
			Morebits.status.info( '完成' );
			window.clearInterval( Twinkle.batchundelete.currentundeletor );
			Morebits.wiki.removeCheckpoint();
			return;
		} else if( work.length !== 0 && Twinkle.batchundelete.currentUndeleteCounter <= Twinkle.getPref('batchUndeleteMinCutOff') ) {
			var pages = work.shift();
			Twinkle.batchundelete.currentUndeleteCounter += pages.length;
			for( var i = 0; i < pages.length; ++i ) {
				var title = pages[i];
				var query = { 
					'token': mw.user.tokens.get().editToken,
					'title': title,
					'action': 'undelete',
					'reason': reason + Twinkle.getPref('deletionSummaryAd')
				};
				var wikipedia_api = new Morebits.wiki.api( "反刪除" + title, query, function( self ) { 
						--Twinkle.batchundelete.currentUndeleteCounter;
						var link = document.createElement( 'a' );
						link.setAttribute( 'href', mw.util.getUrl(self.itsTitle) );
						link.setAttribute( 'title', self.itsTitle );
						link.appendChild( document.createTextNode(self.itsTitle) );
						self.statelem.info( ['完成（',link,'）'] );

					});
				wikipedia_api.itsTitle = title;
				wikipedia_api.post();

			}
		}
	}
};
})(jQuery);


//</nowiki>
